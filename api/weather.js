export default async function handler(req, res) {
  try {
    const city = (req.query.city || "").trim();
    if (!city) {
      return res.status(400).json({ error: "Missing required query param: city" });
    }

    const geoUrl =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(city) +
      "&count=1&language=en&format=json";

    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: "City not found" });
    }

    const place = geoData.results[0];
    const lat = place.latitude;
    const lon = place.longitude;

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,wind_speed_10m" +
      "&timezone=auto";

    const wResp = await fetch(weatherUrl);
    const wData = await wResp.json();

    const c = wData.current;
    const temp = c.temperature_2m;
    const feels = c.apparent_temperature;
    const humidity = c.relative_humidity_2m;
    const rain = c.rain;
    const precip = c.precipitation;
    const windKmh = c.wind_speed_10m;

    const alerts = [];
    if ((rain ?? 0) > 0 || (precip ?? 0) > 0) alerts.push("🌧️ Rain alert: bring an umbrella.");
    if (temp >= 30) alerts.push("🔥 Heat alert: stay hydrated.");
    if (temp <= 0) alerts.push("🧊 Cold alert: dress warm.");
    if (windKmh >= 40) alerts.push("💨 Wind alert: strong winds expected.");

    return res.status(200).json({
      city: place.name,
      country: place.country,
      summary: {
        temp_c: temp,
        feels_like_c: feels,
        humidity_pct: humidity,
        wind_kmh: windKmh,
        rain_mm: rain,
        precipitation_mm: precip,
        time: c.time
      },
      alerts
    });
  } catch (e) {
    return res.status(500).json({ error: "Internal error", details: String(e) });
  }
}
