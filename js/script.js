$(document).ready(function () {
  const bingMapsKey =
    "AtAeF_UYXXF3c0-H0G0Dhp1oNpuFG3tKw7IKZJ8N19cF31fU5j6oRuYSLqkUAn_1";

  const loadGeoJsons = async (locs) => {
    const detailedLocs = [];
    for (const loc of locs) {
      const url = `http://dev.virtualearth.net/REST/v1/Locations/${loc.coords.join(
        ","
      )}?o=json&key=${bingMapsKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(data);
        const l = data.resourceSets[0].resources[0];
        const newFeature = {
          type: "Feature",
          properties: {
            locationType: l.address.addressLine ?? l.name,
            dataField: l.address.formattedAddress ?? l.address.adminDistrict,
            country: l.address.countryRegion,
            panoImg: loc.panoImg,
          },
          geometry: {
            type: "Point",
            coordinates: l.point.coordinates.slice(),
          },
        };
        detailedLocs.push(newFeature);
      } catch (err) {
        console.error(err);
      }
    }
    return detailedLocs;
  };

  const loadData = async () => {
    var features = [];
    const data = await $.get("assets/coordinates.txt", "text");
    const locations = [];
    console.log(data.split("\n")[0].split("\t"));
    data
      .split(" \n")[1]
      .split("\n")
      .slice(0, 10)
      .forEach((v) => {
        var inputData = v.split(" ");
        var newImgPath =
          "assets" + inputData[0].slice(2, inputData[0].length - 1);
        var loc = {
          coords: inputData.slice(2, 4),
          panoImg: newImgPath,
        };
        //console.log(loc);
        locations.unshift(loc);
      });
    const geoJsons = await loadGeoJsons(locations);
    features = geoJsons;
    return {
      type: "FeatureCollection",
      crs: {
        type: "name",
        properties: {
          name: "EPSG:3857",
        },
      },
      features: features,
    };
  };

  const renderMap = (gJO, viewer) => {
    console.log(gJO);
    let osmLayer = new ol.layer.Tile({
      source: new ol.source.OSM(),
      visible: true,
    });
    let bingLayer = new ol.layer.Tile({
      visible: true,
      preload: Infinity,
      source: new ol.source.BingMaps({
        key: bingMapsKey,
        imagerySet: "Road",
      }),
    });
    let vectorLayer;

    let map = new ol.Map({
      target: "mapPlaceholder",
      layers: [osmLayer, bingLayer],
      view: new ol.View({
        center: ol.proj.fromLonLat([10.93360996, 50.98363495]),
        zoom: 20,
        minZoom: 1,
      }),
    });

    let image = new ol.style.Circle({
      radius: 5,
      fill: new ol.style.Fill({
        color: "red",
      }),
      stroke: new ol.style.Stroke({ color: "red", width: 1 }),
    });
    let pointStyle = new ol.style.Style({
      image: image,
    });
    let vectorSource = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(gJO, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
    });
    let styleFunction = function (feature) {
      return pointStyle;
    };
    vectorLayer = new ol.layer.Vector({
      source: vectorSource,
      style: styleFunction,
    });
    let selectStyle = new ol.style.Style({
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: "blue",
        }),
        stroke: new ol.style.Stroke({
          color: "blue",
          width: 1,
        }),
      }),
    });
    let selectInteraction = new ol.interaction.Select({
      style: selectStyle,
    });
    map.addInteraction(selectInteraction);

    map.addLayer(vectorLayer);

    $("#recenter-btn").on("click", async (e) => {
      e.target.value = "Recentering..";

      await map.setView(
        new ol.View({
          center: ol.proj.fromLonLat([10.93360996, 50.98363495]),
          zoom: 20,
          minZoom: 1,
        })
      );
      e.target.value = "Recenter";
    });

    let currentPanorama = null;

    map.on("click", function (event) {
      map.forEachFeatureAtPixel(event.pixel, async (feature, layer) => {
        let imgUrl = feature.get("panoImg");
        if (currentPanorama) 
          currentPanorama.dispose()

        currentPanorama = new PANOLENS.ImagePanorama(imgUrl);
        console.log(imgUrl);

        await viewer.add(currentPanorama);
      });
    });
  };

  async function main() {
    const geoJsonObject = await loadData();
    console.log(geoJsonObject);
    const viewer = new PANOLENS.Viewer({
      container: document.getElementById("pano-viewer"),
    });

    renderMap(geoJsonObject, viewer);
  }
  main();
});
