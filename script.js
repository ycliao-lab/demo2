// API endpoints
const GEOCODING_API = 'https://nominatim.openstreetmap.org/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// DOM elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherResult = document.getElementById('weatherResult');
const loadingSpinner = document.getElementById('loadingSpinner');
const welcome = document.getElementById('welcome');
const errorDiv = document.getElementById('error');

// Weather condition emojis mapping
const weatherEmojis = {
    0: '☀️',      // Clear sky
    1: '🌤️',      // Mainly clear
    2: '⛅',      // Partly cloudy
    3: '☁️',      // Overcast
    45: '🌫️',     // Foggy
    48: '🌫️',     // Depositing rime fog
    51: '🌧️',     // Light drizzle
    53: '🌧️',     // Moderate drizzle
    55: '⛈️',     // Dense drizzle
    61: '🌧️',     // Slight rain
    63: '🌧️',     // Moderate rain
    65: '⛈️',     // Heavy rain
    71: '❄️',     // Slight snow
    73: '❄️',     // Moderate snow
    75: '❄️',     // Heavy snow
    77: '❄️',     // Snow grains
    80: '🌦️',     // Slight rain showers
    81: '🌧️',     // Moderate rain showers
    82: '⛈️',     // Violent rain showers
    85: '❄️',     // Slight snow showers
    86: '❄️',     // Heavy snow showers
    80: '🌦️',     // Rain showers
    95: '⛈️',     // Thunderstorm
    96: '⛈️',     // Thunderstorm with slight hail
    99: '⛈️'      // Thunderstorm with heavy hail
};

const weatherDescriptions = {
    0: '晴朗',
    1: '主要晴朗',
    2: '多雲',
    3: '陰天',
    45: '起霧',
    48: '起霧',
    51: '毛毛雨',
    53: '中度毛毛雨',
    55: '大毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '小陣雨',
    81: '中陣雨',
    82: '強陣雨',
    85: '小陣雪',
    86: '大陣雪',
    95: '雷暴',
    96: '雷暴伴雹',
    99: '強雷暴伴雹'
};

// Event listeners
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
locationBtn.addEventListener('click', handleLocationRequest);

// Search handler
async function handleSearch() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('請輸入城市名稱');
        return;
    }
    clearError();
    await searchWeather(city);
}

// Location handler
function handleLocationRequest() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await fetchWeatherByCoordinates(latitude, longitude);
            },
            (error) => {
                hideLoading();
                showError('無法獲取位置信息，請檢查位置權限');
                console.error(error);
            }
        );
    } else {
        showError('您的瀏覽器不支持地理定位');
    }
}

// Search weather by city name
async function searchWeather(city) {
    try {
        showLoading();
        clearError();

        // Get city coordinates
        const response = await fetch(
            `${GEOCODING_API}?q=${encodeURIComponent(city)}&format=json&limit=1`
        );
        const data = await response.json();

        if (!data || data.length === 0) {
            showError('找不到該城市，請檢查拼寫');
            hideLoading();
            return;
        }

        const { name, lat, lon, address } = data[0];
        cityInput.value = name;

        await fetchWeatherByCoordinates(lat, lon, name);
    } catch (error) {
        showError('搜尋失敗，請重試');
        console.error('Search error:', error);
        hideLoading();
    }
}

// Fetch weather by coordinates
async function fetchWeatherByCoordinates(latitude, longitude, cityName = null) {
    try {
        showLoading();

        const params = new URLSearchParams({
            latitude: latitude,
            longitude: longitude,
            current: 'temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,pressure_msl,visibility,uv_index,wind_speed_10m',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min',
            hourly: 'temperature_2m,weather_code',
            timezone: 'auto'
        });

        const response = await fetch(`${WEATHER_API}?${params}`);
        const weatherData = await response.json();

        if (cityName === null) {
            // Get location name from coordinates
            try {
                const reverseGeoResponse = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                );
                const reverseData = await reverseGeoResponse.json();
                cityName = reverseData.address?.city || 
                          reverseData.address?.county || 
                          reverseData.address?.country || 
                          `(${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
            } catch (e) {
                cityName = `(${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
            }
        }

        displayWeather(weatherData, cityName);
    } catch (error) {
        showError('獲取天氣數據失敗，請重試');
        console.error('Weather fetch error:', error);
    } finally {
        hideLoading();
    }
}

// Display weather data
function displayWeather(data, cityName) {
    const current = data.current;
    const daily = data.daily;

    // Update location info
    document.getElementById('locationName').textContent = cityName;
    const now = new Date();
    document.getElementById('updateTime').textContent = 
        `更新時間: ${now.toLocaleString('zh-TW')}`;

    // Update current weather
    const weatherCode = current.weather_code;
    const emoji = weatherEmojis[weatherCode] || '🌤️';
    const description = weatherDescriptions[weatherCode] || '未知';

    document.getElementById('temperature').textContent = 
        `${Math.round(current.temperature_2m)}°C`;
    document.getElementById('weatherDesc').textContent = description;
    document.getElementById('weatherIcon').textContent = emoji;

    // Update details
    document.getElementById('feelsLike').textContent = 
        `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById('humidity').textContent = 
        `${current.relative_humidity_2m}%`;
    document.getElementById('windSpeed').textContent = 
        `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('pressure').textContent = 
        `${current.pressure_msl} hPa`;
    document.getElementById('visibility').textContent = 
        `${(current.visibility / 1000).toFixed(1)} km`;
    document.getElementById('uvIndex').textContent = 
        `${Math.round(current.uv_index)}`;

    // Update 7-day forecast
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';

    if (daily && daily.time) {
        for (let i = 0; i < Math.min(7, daily.time.length); i++) {
            const date = new Date(daily.time[i]);
            const code = daily.weather_code[i];
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);

            const forecastDate = date.toLocaleDateString('zh-TW', { 
                month: '2-digit', 
                day: '2-digit' 
            });

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.innerHTML = `
                <div class="forecast-date">${forecastDate}</div>
                <div class="forecast-icon">${weatherEmojis[code] || '🌤️'}</div>
                <div class="forecast-temp">${maxTemp}°C</div>
                <div class="forecast-temp-range">↓ ${minTemp}°C</div>
            `;
            forecastContainer.appendChild(forecastItem);
        }
    }

    // Show result, hide welcome
    weatherResult.classList.remove('hidden');
    welcome.classList.add('hidden');
}

// UI helper functions
function showLoading() {
    loadingSpinner.classList.remove('hidden');
    weatherResult.classList.add('hidden');
    welcome.classList.add('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    weatherResult.classList.add('hidden');
}

function clearError() {
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
}
