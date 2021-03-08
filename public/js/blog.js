fetch("/get_blog_entries", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
}).then(function (response) {
  return response.json().then((res) => {
    var sidebar = `<div class="postListTitle">Posts</div><button class="postScrollUp"><ion-icon name="caret-up-outline"></ion-icon></button><div class="postList">`;
    var entries = [];
    for (let key in res.contents) {
      if (res.contents.hasOwnProperty(key)) {
        entries.push(res.contents[key]);
      }
    }
    entries.sort((a, b) => {
      return b.data.date - a.data.date;
    });
    var highlighted = " activeSidebar";
    entries.forEach((blog) => {
      sidebar +=
        `<div class="postTitle` +
        highlighted +
        `" x-date="` +
        blog.data.date +
        `">` +
        blog.data.title +
        `</div>`;
      highlighted = "";
    });
    sidebar += `</div><button class="postScrollDown"><ion-icon name="caret-down-outline"></ion-icon></button>`;
    $(".blogSidebar").html(sidebar);
    $(".activePost").html(createActiveBlog(entries[0]));
    addScrollListeners();
    localforage.setItem("entries", entries).then(() => {
      $(".postTitle").each((i, e) => {
        $(e).on("click", function (e) {
          localforage.getItem("entries").then((blogs) => {
            var index = blogs.findIndex((obj) => {
              return obj.data.date == $(e.target).attr("x-date");
            });
            $(".activePost").html(createActiveBlog(blogs[index]));
            setNewSidebarHighlight();
          });
        });
      });
    });
  });
});

function createActiveBlog(entry) {
  return (
    `<div class="activeTitle" x-date="` +
    entry.data.date +
    `">` +
    entry.data.title +
    `</div><div class="activeDate">` +
    customDateFormat(entry.data.date) +
    `</div><div class="activeBody">` +
    entry.content +
    `</div>`
  );
}

function customDateFormat(date) {
  date = date.toString();
  return date.substr(0, 4) + "/" + date.substr(4, 2) + "/" + date.substr(6, 2);
}

function setNewSidebarHighlight() {
  var date = $(".activeTitle").attr("x-date");
  $(".postTitle").each((i, e) => {
    if ($(e).attr("x-date") == date) {
      $(e).addClass("activeSidebar");
    } else {
      $(e).removeClass("activeSidebar");
    }
  });
}

function addScrollListeners() {
  $(".postScrollUp").on("click", () => scrollElement("up"));
  $(".postScrollDown").on("click", () => scrollElement("down"));
}

function scrollElement(direction) {
  console.log("Scroll " + direction);
  var current = $(".postList").scrollTop();
  if (direction === "up") {
    $(".postList").scrollTop(
      current - parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
  } else {
    $(".postList").scrollTop(
      current + parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
  }
}

window.addEventListener("load", function () {});

function getvh() {
  // First we get the viewport height and we multiple it by 1% to get a value for a vh unit
  let vh = window.innerHeight * 0.01;
  // Then we set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty("--vh", `${vh}px`);
  document.documentElement.style.setProperty("--vh2", `${vh * 2}px`);
  document.documentElement.style.setProperty("--vh3", `${vh * 3}px`);
  document.documentElement.style.setProperty("--vh4", `${vh * 4}px`);
  document.documentElement.style.setProperty("--vh10", `${vh * 10}px`);
  document.documentElement.style.setProperty("--vh20", `${vh * 20}px`);
  document.documentElement.style.setProperty("--vh30", `${vh * 30}px`);
  document.documentElement.style.setProperty("--vh40", `${vh * 40}px`);
  document.documentElement.style.setProperty("--vh50", `${vh * 50}px`);
  document.documentElement.style.setProperty("--vh60", `${vh * 60}px`);
  document.documentElement.style.setProperty("--vh70", `${vh * 70}px`);
  document.documentElement.style.setProperty("--vh80", `${vh * 80}px`);
  document.documentElement.style.setProperty("--vh90", `${vh * 90}px`);
  document.documentElement.style.setProperty("--vh100", `${vh * 100}px`);
  document.documentElement.style.setProperty("--vh5", `${vh * 5}px`);
  document.documentElement.style.setProperty("--vh15", `${vh * 15}px`);
  document.documentElement.style.setProperty("--vh25", `${vh * 25}px`);
  document.documentElement.style.setProperty("--vh75", `${vh * 75}px`);
}
getvh();
