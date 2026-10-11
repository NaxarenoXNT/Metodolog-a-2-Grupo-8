class MapboxAdapter {
  constructor(token) {
    if (!token) {
      throw new Error('Se requiere un token de Mapbox para MapboxAdapter');
    }
    this.token = token;
    this.baseUrl = 'https://api.mapbox.com/directions/v5/mapbox/driving';
  }

  async calcularDistancia(origen, destino) {
    if (!origen || origen.lat === undefined || origen.lng === undefined) {
      throw new Error('Origen inválido: se espera { lat, lng }');
    }
    if (!destino || destino.lat === undefined || destino.lng === undefined) {
      throw new Error('Destino inválido: se espera { lat, lng }');
    }

    const coordinates = ${origen.lng},;,;
    const url = ${this.baseUrl}/?geometries=geojson&overview=full&access_token=;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(Error al consultar Mapbox Directions:  );
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No se encontraron rutas en la respuesta de Mapbox');
    }

    const distanciaMetros = data.routes[0].distance;
    const distanciaKm = distanciaMetros / 1000;
    return Number(distanciaKm.toFixed(3));
  }
}

module.exports = MapboxAdapter;
