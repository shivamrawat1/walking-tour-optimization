import numpy as np
import cvxpy as cp

def solve_tsp_with_subtour_elimination(distances):
    n = len(distances)
    
    # Decision variables
    x = cp.Variable((n, n), boolean=True)
    u = cp.Variable(n, integer=True)
    
    # Objective: Minimize total travel distance
    objective = cp.Minimize(cp.sum(cp.multiply(x, distances)))
    
    # Constraints
    constraints = [
        cp.sum(x, axis=0) == 1,  # Exactly one city enters each city
        cp.sum(x, axis=1) == 1,  # Exactly one city leaves each city
        cp.diag(x) == 0          # No city loops to itself
    ]
    
    # Subtour elimination constraints (MTZ formulation)
    for i in range(1, n):
        for j in range(1, n):
            if i != j:
                constraints.append(u[i] - u[j] + n * x[i, j] <= n - 1)
    
    # Solve the problem
    prob = cp.Problem(objective, constraints)
    prob.solve()  # Add solver=cp.GUROBI or another MIP solver if available
    
    # Check if a valid solution was found
    if prob.status not in [cp.OPTIMAL, cp.OPTIMAL_INACCURATE]:
        raise Exception("No optimal solution found.")
    
    # Extract the tour matrix
    tour_matrix = x.value.round().astype(int)
    
    # Reconstruct the tour
    tour = reconstruct_tour(tour_matrix)
    
    # Compute the total distance of the chosen route
    path_dist = 0
    for i in range(n):
        for j in range(n):
            if tour_matrix[i, j] == 1:
                path_dist += distances[i, j]

    return tour, path_dist

def reconstruct_tour(tour_matrix):
    n = len(tour_matrix)
    tour = [0]
    current = 0
    
    for _ in range(n - 1):
        for j in range(n):
            if tour_matrix[current, j] == 1 and j not in tour:
                tour.append(j)
                current = j
                break
    
    # Close the loop
    tour.append(tour[0])
    return tour
