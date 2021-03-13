---
title: The Beginning
date: 20210307
---

## Getting Started

I knew in beginning this that I wanted to develop a project in some semblance of a "real" way. It began with finally learning to use git with github, VS Code, and deciding on a stack of Node and Mongo, with only jQuery for the frontend because that was something I already knew.

Currently this app is built with

1. Node as the basis for creating the server
2. Express as the actual server
3. Mongo as the DB, hosted at Mongo's Cloud Atlas
4. Pug (formerly Jade) as the templating Engine
5. jQuery to help with the frontend library
6. Auth0 for Google and "local" authentication

And many, many npm libraries:

1. Socket.io for websockets to do live notifications
2. localforage for the local IndexedDB
3. fuse.js and jaro-winkler for fuzzy searching
4. Many others!

I use Board Game Atlas to populate game descriptions, information, and thumbnails.

All of this gets combined in giant monolithic files:

1. One for the backend (app.js)
2. One for the frontend (main.js)
3. One for sockets (socket.io)
4. One for CSS (main.css)

Other smaller pieces like this blog, the terms of service, the views, and the models are actually in smaller pieces.

## What I would change

I wouldn't create monoliths next time - it seems better to use modules, and then use a technology like webpack to bind it all together for publishing.

I would also be more systematic about CSS organization, memory usage, CPU usage, and accessibility. And I'd write better comments, but those are the famous last words of any well-intentioned developer.
