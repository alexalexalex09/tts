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

## Pride and Fall

I was so proud to begin this project with a scope and a wireframe. I stuck to that wireframe as I built the initial pages of the app, and I was so proud of the great idea I had to do a single page app (SPA) with multiple views. I crafted my own little "framework" out of HTML, CSS, and JS, which you can still see in use on the site today. Every view is included in the structure of the HTML itself: seven views in all, plus five "popup" views. This means that each view can be written to and read from all without network connectivity, which is nice. I'm interested to learn how other frameworks would accomplish this. My goal was to make this as seamless to load as possible, given my limited knowledge at the beginning of the project. Back then, I was super excited about being able to use a thing called "Ajax", which seems almost quaint now.

I'm glad that I learned the word "sophomoric", because it applies so well to so many things that I do, this site being one of them. With the first views created and working, I thought I had learned a great lesson: if you embed data in the HTML of the page, it can be accessed anywhere. I ran into some big problems with this, though: I decided to embed data for individual board games in XML structures in the HTML itself (am I even using those words right?). What I ended up learning was that storing data in the HTML of a site is really ineffecient. There were points in development where I had well over 10000 nodes in my HTML, in very deeply nested structures, and for some reason the site got _very slow_. I ended up learning about localStorage, and proceeded to abuse that to the point I was parsing JSON files that were _waaay_ too big. So I learned about IndexedDB and _finally_ learned enough to know that I couldn't do that well, so ended up using localforage (in combination with localStorage) to get the site to run the way it is today. I did learn about Redis - enough to abuse that and decide to give up - and that's something I'd like to be able to implement better in the future. For now it's scrapped, which is for the best.

## Moving Ahead

What's fascinating to me about this site today is the incremental nature of it. You can watch my coding knowledge evolve in different areas (especially because I started to use git early on!) and see the different layers of knowledge being built up. By looking at my code, I can tell you roughly how old it is, which I imagine is true of a lot of code out there. My point is that I wasn't afraid to go out there and do things wrong. By doing things wrong, I got to new plateaus where I wasn't able to progress until I fixed mistakes made previously. It was like my past self kept sending coding challenges into the future for me to solve, and by solving them I advanced my skills.

For me, coding is enjoyable because it's a set of puzzles with instant feedback that reward you with both skills and useful results. And for some reason I'm not afraid to go out there and break things, which makes it acceptable to get the feedback that, yes, this error breaks everything. And so, even when I get stuck it felt like I was moving forward because those five hours I spent chasing down a typo gave me five hours worth of instruction on debugging. Which, as it turns out, is a skill that's useful outside of coding as well. This project has given me a lot of coding knowledge, but it also taught me a lot about myself and given me insights into other areas of my life. Maybe that's a useful metric for any hobby.
