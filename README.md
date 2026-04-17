
# 3D Contribution Flythrough

This is a simple repository with the dedicated purpose of running a GitHub action to generate a 3D flythrough of recent repository contributions.

## How it works

A simple 3D rendering is made using ThreeJS, pulling GitHub user data to make a GitHub-style contribution graph, but also using height to encode contribution amounts. Then a camera is directed along a path, choosing 3 interesting days to briefly focus on, with a change in color pulse and in-scene UI callouts. Finally, a GitHub action generates a gif based on this scene at the start of every month, so that it always displays recent information.

## The result

The resulting gif is updated through an automatic commit, see the result below.

![GIF animation of a 3D GitHub contribution graph flythrough](/contributions.gif)

## Making it your own

If you wish to use this yourself, you can fork the repository. See `/.github/workflows.generate.yml` for how data is pulled and the cron schedule is defined.

To run locally, you can easily run a vite server and check the result in your browser, or generate a local gif.

```sh
# Install dependencies
npm install
# Run Vite Server
npm run dev
# Generate local gif (in another shell)
node export.js
```