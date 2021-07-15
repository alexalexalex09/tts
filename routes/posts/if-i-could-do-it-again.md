---
title: If I could do it again
date: 20210713
---

## What I would change

There's so much about this site that I would change if I was building it again today.

### Monoliths and Modules

I wouldn't create monoliths next time - it seems better to use modules, and then use a technology like webpack to bind it all together for publishing. I don't think a site like this necessarily requires an engine like React, but I do wonder if it would help.

### Resource Management

From the very beginning, I should have been thinking about data structure and memory management. I did try to use SQL at the beginning, but it didn't make sense to me. I wanted to put objects in those SQL tables so badly, and then I learned about Mongo, which seemed to solve my exact problem. I was able to intuit things about Mongo so much more easily, and therefore was more motivated to learn and work around its quirks. I had to restructure my database a few times because I ended up coding one giant object in a database and putting everything inside it, because I misunderstood where the bottlenecks were. And that was after many, many tutorial articles and youtube videos! I wonder if my site would be faster with an SQL database, but I'm certainly not going to redo it. A background education in databases would have likely been helpful here.

### Code Organization

This code still feels like a jumble to me. I began by following Mozilla's [https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Tutorial_local_library_website](Local Library tutorial), which dictated my initial folder and file structure. Along the way it shifted as new frameworks were introduced. You'll be able to see in the repository that there are still old folders in there that I'm still afraid to get rid of! Again, this is a problem with iterative design: the final product doesn't match the initial structure, and barring a rewrite basically from scratch it's hard to fix it.

My JS files are (because of Local Library) weirdly named, but effective monoliths. There's an app.js with the main app structure, a public.js with all the backend logic, and a main.js with all the frontend logic. Here, too, you can see the stratified nature of my code as I used different strategies to organize it as I moved along. You can also see where I was way to excited, focused, or exhausted to organize anything and just wrote code without comments or commented out code instead of deleting it because I wasn't sure what would happen.

CSS, on the other hand, was one area I thought I was doing marginally well. I'm actually interested to do more learning about ways to organize CSS files, because it's still difficult to find what I'm looking for in the monolith I ended up making. On the plus side, it's only one request when downloading. I've always been afraid of SCSS and its variants, but it probably could have made my code easier to read.

### Accessibility

I was excited to design this website mobile-first. It was my first real attempt at doing so, and I think it went relatively well for someone who doesn't have a ton of design skill. There are still a few things I missed (like paying for a service that simulates devices rather than stealing my wife's iPhone for testing) but I thought that mobile-first gave a great coding experience and was particularly useful because I imagine the site primarily being used by mobile users. Desktop is clearly an afterthought for this.

What I would have done differently is to also design accessibility-first. There are many parts of this site that aren't accessiblity-friendly, and I haven't actually gotten around to figuring out how screen readers work to test it out. I tried to be cognizant of some best practices that I became aware of, but I'm not winning any awards here. This has become more and more important, so it's one of the pieces that I want to come back and improve upon.

## An Actual Do-Over

So, if I've learned so much over the course of a year and a half, why not just start over? I understand the site inside and out, I know how the tech stack works much better, and I can skip over so many steps. It would only take a fraction of the time!

First, because a fraction of the time is still huge. With all the reading and learning included, I probably spent 10 hours each week on this, sometimes more if I had the time, over 12 months or so. That's maybe 500 hours? So even if it took me half that time, it's a huge investment. (Another thing I would do - track my time to see how much it actually cost me to make this)

Realistically, I'd get bored. Much of the fun of this was learning new things. So if I was really going to remake it, I'd want to make it using, say, React, with a backend written in python, with SQL as the database. Or something else new. And I'm easily back to a year of coding and learning with that, with an equally stratified product. Coding as a hobby just seems so different than what it might be working in a shop.

In the end, I'm excited to move on and find a completely different project to either hone my skills or learn something new. I'm ready to move on instead of doing it over again, and I have the ability to do just that.
