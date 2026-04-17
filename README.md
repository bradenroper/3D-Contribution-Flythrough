
# 3D Contribution Flythrough

This is a simple repository with the dedicated purpose of running a GitHub action to generate a 3D flythrough of recent repository contributions.

## How it works

A simple 3D rendering is made using ThreeJS, pulling GitHub user data to make a GitHub-style contribution graph, but also using height to encode contribution amounts. Then a camera is directed along a path, choosing 3 interesting days to briefly focus on, with a change in color pulse and in-scene UI callouts. Finally, a GitHub action generates a gif based on this scene at the start of every month, so that it always displays recent information.