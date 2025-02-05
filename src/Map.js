"use strict";

import { useState, useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { LayerGroup } from "react-leaflet/LayerGroup";
import { useMap } from "react-leaflet/hooks";
import L from "leaflet";

import icon from "leaflet/dist/images/marker-icon.png";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Icon } from "leaflet/src/layer/marker/Icon"

// We need to override the icon locations due to shenanigans in react-leaflet.
let defaultIcons = new L.Icon.Default();
defaultIcons.options.iconUrl = icon;
defaultIcons.options.iconRetinaUrl = icon2x;
defaultIcons.options.shadowUrl = iconShadow;

const MAP_CONTAINER_ID = "map";
const DEFAULT_ZOOM_LEVEL = 10;
const LOCATION_CACHE_KEY = "userLatLng";
// Location to initialize the map to if no user location can be found.
const FALLBACK_INITIAL_LOCATION = [51.505, -0.09];

// Check for a cached user location to use as the initial view.
let initialLocation = FALLBACK_INITIAL_LOCATION;
let locationCacheHit = false;
try {
  let cachedLocationStr = localStorage.getItem(LOCATION_CACHE_KEY);
  if (cachedLocationStr == null) {
    console.log("User location not set in local storage.");
  } else {
    // Make sure the cached data is in roughly the format we expect.
    let [lat, lng] = JSON.parse(cachedLocationStr);
    initialLocation = [lat, lng];

    locationCacheHit = true; // Should be the last thing we do in case we get an exception.
  }
} catch (e) {
  console.log("Error while attempting to parse cached location from local storage:");
  console.log(e);
  localStorage.clear();
  console.log("Local storage cleared.");
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // Success.
        (resp) => {
          resolve([resp.coords.latitude, resp.coords.longitude]);
        },
        // Failure.
        (e) => {
          reject(e);
        }
      );
    } else {
      alert("Please enable the browser to know your location or Geolocation is not supported by this browser.");
      reject();
    }
  });
}

function Map() {
  const [tourneyData, setTourneyData] = useState([]);
  const [mapCenter, setMapCenter] = useState(initialLocation);
  // Until this is false, we wish to convey to the user that the view may suddenly
  // change (for example, when the user's location is finished loading from the browser.)
  // If we hit the location cache when this module was first loading, the view is probably
  // close to where the user actually is, and thus should not
  // suddenly change.
  const [locationLoading, setLocationLoading] = useState(!locationCacheHit);

  // Load tournament data once.
  useEffect(() => {
    fetch("tournaments.json").then((resp) => {
      resp.json().then(setTourneyData);
    });
  }, []); // Passing in empty array means this only runs once.

  // Attempt to get location from the browser once.
  useEffect(() => {
    getCurrentPosition()
      .then((location) => {
        // Cache location for future use.
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));

        // Only set the view if it hasn't been set yet.
        // We don't want to interfere with any scrolling
        // the user did while we were searching for the location.
        if (locationLoading) {
          console.log("updating location");
          setMapCenter(location);
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        // Remove loader overlay, if applicable.
        setLocationLoading(false);
      });
  }, []);

  return <>
    <a href="http://mapbox.com/about/maps" className="mapbox-logo" target="_blank">Mapbox</a>
    <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM_LEVEL} id="map" worldCopyJump={true}>
      {locationLoading && <Overlay />}
      <ViewChanger center={mapCenter} />
      <TileLayer
        attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'
        url="https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZ3JhdmlkZGQiLCJhIjoiY2wwZDh3eDE2MDZ1OTNrcGYybjhsNmN2diJ9.cPvRZK6WTt_wjQSa-DzblQ"
        maxZoom={14}
        minZoom={3}
        maxNativeZoom={11}
      >
      </TileLayer>
      <LayerGroup>
        {
          tourneyData.map((tourneyJSON) =>
            <Marker key={tourneyJSON.url} position={tourneyJSON.location} icon={defaultIcons}>
              <Popup>
                <h2>
                  <a href={tourneyJSON["url"]} target="_blank">{tourneyJSON["name"]}</a>
                </h2>
                <p>{new Date(tourneyJSON["start_time"] * 1000).toLocaleString()}</p>
              </Popup>
            </Marker>
          )
        }
      </LayerGroup>
    </MapContainer>
  </>
}

// The view location (center, zoom) as set in the MapContainer properties only
// affects the INITIAL view location. Anything after the fact must be set using
// the useMap() hook, which is only available to children of MapContainer.
// It's wonky but whatever.
function ViewChanger({ center }) {
  let map = useMap()
  map.setView(center, map.zoom);
  return null;
}

// Grayed-out overlay with a circular loader thingy in the middle.
function Overlay() {
  return <>
    <div className="overlay"></div>
    <div className="loader"> </div>
  </>
}

export default Map;
