let map, searchBox, directionsService;
let locations = []; // Array to store selected places
let markers = [];   // Array to store map markers
let currentPolyline = null;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 10,
    });

    const searchBoxInput = document.getElementById("search-box");
    searchBox = new google.maps.places.SearchBox(searchBoxInput);
    directionsService = new google.maps.DirectionsService();

    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (!places || places.length === 0) return;

        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) return;
            
            const location = {
                name: place.name,
                address: place.formatted_address,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
            };
            locations.push(location);

            const marker = new google.maps.Marker({
                map,
                position: place.geometry.location,
                title: place.name,
                label: `${locations.length}`,
            });
            markers.push(marker);

            updateLocationList();
        });
    });
}

function updateLocationList() {
    const locationList = document.getElementById("location-list");
    locationList.innerHTML = "";
    locations.forEach((location, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${index + 1}. ${location.name}
            <button class="remove-btn" onclick="removeLocation(${index})">X</button>
        `;
        locationList.appendChild(li);
    });

    // Enable or disable the "Optimize Route" button
    const optimizeBtn = document.getElementById("optimize-btn");
    optimizeBtn.disabled = locations.length < 3;
}

function removeLocation(index) {
    locations.splice(index, 1);
    markers[index].setMap(null);
    markers.splice(index, 1);

    // Update marker labels
    markers.forEach((marker, i) => {
        marker.setLabel(`${i + 1}`);
    });

    updateLocationList();
}

function clearLocations() {
    locations = [];
    clearMarkers();
    clearPaths();
    updateLocationList();
    document.getElementById("result").innerHTML = "";
}

function clearMarkers() {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
}

function clearPaths() {
    if (currentPolyline) {
        currentPolyline.setMap(null);
        currentPolyline = null;
    }
}

function optimizeRoute() {
    console.log("Sending locations to server:", locations);
    axios.post("/optimize-route", { locations })
        .then((response) => {
            const data = response.data;
            console.log("Received optimized route data:", data);
            if (!data.optimized_route || data.optimized_route.length === 0) {
                console.error("No optimized_route returned from server.");
                return;
            }
            buildAndDrawPath(data.optimized_route);
        })
        .catch((error) => {
            console.error("Error optimizing route:", error);
            alert("Error optimizing route");
        });
}

function buildAndDrawPath(route) {
    if (route.length < 2) {
        console.log("Not enough points for a route.");
        return;
    }

    // Ensure route is closed by checking if the last point is the same as the first
    const first = route[0];
    const last = route[route.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) {
        route.push({ ...first });
    }

    console.log("Building path from route:", route);

    const segmentRequests = [];
    for (let i = 0; i < route.length; i++) {
        const start = route[i];
        const end = route[(i + 1) % route.length];
        segmentRequests.push(
            getSegmentDirections(start, end).catch((err) => {
                console.error(`Directions failed for segment ${start.name} -> ${end.name}:`, err);
                // Fallback: just draw a direct line between these two points
                return [new google.maps.LatLng(start.lat, start.lng), new google.maps.LatLng(end.lat, end.lng)];
            })
        );
    }

    Promise.all(segmentRequests)
        .then((segments) => {
            console.log("All segments retrieved:", segments);
            
            let completePath = [];
            segments.forEach((segment, index) => {
                // Avoid duplicating the last point of each segment except the last one
                if (index < segments.length - 1) {
                    completePath = completePath.concat(segment.slice(0, -1));
                } else {
                    completePath = completePath.concat(segment);
                }
            });

            clearPaths();
            console.log("Complete path:", completePath);

            currentPolyline = new google.maps.Polyline({
                map: map,
                path: completePath,
                strokeColor: "#0000FF",
                strokeOpacity: 1.0,
                strokeWeight: 3,
            });

            // Fit the map to the entire path
            const bounds = new google.maps.LatLngBounds();
            completePath.forEach((latlng) => bounds.extend(latlng));
            map.fitBounds(bounds);

            // Display the actual place names of the route
            displayRoute(route);
        })
        .catch((err) => {
            console.error("Error building route segments:", err);
        });
}

function getSegmentDirections(start, end) {
    return new Promise((resolve, reject) => {
        console.log(`Requesting directions from ${start.name} to ${end.name}`);
        directionsService.route({
            origin: new google.maps.LatLng(start.lat, start.lng),
            destination: new google.maps.LatLng(end.lat, end.lng),
            travelMode: google.maps.TravelMode.WALKING,
        }, (response, status) => {
            if (status === "OK") {
                const path = response.routes[0].overview_path;
                resolve(path);
            } else {
                console.error("Directions request failed due to " + status);
                reject(status);
            }
        });
    });
}

function displayRoute(route) {
    const routeContainer = document.getElementById("result");
    if (!route || route.length === 0) {
        routeContainer.innerHTML = "No route available.";
        return;
    }

    // Just output the names directly, e.g. "Marina District --> Salesforce Tower --> Embarcadero BART Station Elevator --> Marina District"
    const routeNames = route.map(loc => loc.name);
    routeContainer.innerHTML = routeNames.join(" --> ");
}

google.maps.event.addDomListener(window, "load", initMap);
