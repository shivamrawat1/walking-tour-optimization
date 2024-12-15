import numpy as np
import googlemaps
import os

gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))

def get_distance_matrix(locations):
    """
    Retrieve the distance matrix using the Google Maps Distance Matrix API.
    """
    matrix_result = gmaps.distance_matrix(
        origins=locations,
        destinations=locations,
        mode='driving'
    )
    
    distances = []
    for row in matrix_result['rows']:
        row_distances = [
            element['distance']['value'] / 1000  # Convert to kilometers
            for element in row['elements']
        ]
        distances.append(row_distances)
    
    return np.array(distances)
