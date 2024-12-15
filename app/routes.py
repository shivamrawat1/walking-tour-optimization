from flask import request, jsonify
from app import app
from app.tsp_solver import solve_tsp_with_subtour_elimination
from app.utils import get_distance_matrix
import os
from flask import render_template

@app.route('/')
def home():
    return render_template('index.html')  # Renders the frontend template

@app.route('/optimize-route', methods=['POST'])
def optimize_route():
    data = request.json
    locations = data.get('locations', [])
    print("Received locations:", locations)  # Debugging

    if len(locations) < 3 or len(locations) > 10:
        return jsonify({'error': 'Please provide between 3 and 10 locations'}), 400

    try:
        # Get distance matrix
        distance_matrix = get_distance_matrix(locations)
        print("Distance matrix:", distance_matrix)  # Debugging
        
        # Solve TSP
        optimal_tour, total_distance = solve_tsp_with_subtour_elimination(distance_matrix)
        print("Optimal tour:", optimal_tour)  # Debugging
        
        # Reorder locations based on optimal tour
        # Include the last index to close the loop
        optimized_locations = [locations[i] for i in optimal_tour]

        return jsonify({
            'optimized_route': optimized_locations,
            'total_distance': total_distance,
            'tour_indices': optimal_tour
        })
    except Exception as e:
        print("Error:", e)  # Debugging
        return jsonify({'error': str(e)}), 500

@app.route('/get-frontend-key', methods=['GET'])
def get_frontend_key():
    """
    Serve the frontend API key securely to the client.
    """
    frontend_key = os.getenv('GOOGLE_MAPS_FRONTEND_API_KEY')
    if not frontend_key:
        return jsonify({'error': 'Frontend API key not found'}), 500
    
    return jsonify({'frontend_api_key': frontend_key})
