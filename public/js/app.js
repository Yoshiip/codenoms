// Screens

const Screens = {
  Name: "Name",
  Menu: "Menu",
  Lobby: "Lobby",
  Game: "Game",
};

const Roles = {
  None: "None",
  Detective: "Detective",
  Spy: "Spy",
};

const Teams = {
  None: "None",
  Red: "Red",
  Blue: "Blue",
};

const Turns = {
  RedSpies: "RedSpies",
  RedDetectives: "RedDetectives",
  BlueSpies: "BlueSpies",
  BlueDetectives: "BlueDetectives",
};

var screen;
var lang = "fr";
var role = Roles.None;
var team = Teams.None;

var name_container = document.getElementById("name_container");
var menu_container = document.getElementById("menu_container");
var lobby_container = document.getElementById("lobby_container");
var game_container = document.getElementById("game_container");

// Socket
const socket = io();

var players = [];
var room_id = "";

socket.on("alert", (msg) => {
  alert(msg);
});

function switchScreen(new_screen) {
  screen = new_screen;
  name_container.style.display = screen === Screens.Name ? "flex" : "none";
  menu_container.style.display = screen === Screens.Menu ? "flex" : "none";
  lobby_container.style.display = screen === Screens.Lobby ? "flex" : "none";
  game_container.style.display = screen === Screens.Game ? "flex" : "none";
  switch (screen) {
    case Screens.Lobby:
      changedSceneToLobby();
      break;

    default:
      break;
  }
}

const clamp = (
  /** @type {number} */ num,
  /** @type {number} */ min,
  /** @type {number} */ max
) => Math.min(Math.max(num, min), max);

/**
 * @param {number} start
 * @param {number} end
 * @param {number} progress
 */
function lerp(start, end, progress) {
  return (1.0 - progress) * start + progress * end;
}

let mouseY = 0;

addEventListener("mousemove", (e) => {
  mouseY = e.clientY;
});

setInterval(() => {
  let pos = lerp(
    Number(document.body.style.backgroundPositionY.slice(0, -1)),
    (mouseY * 20) / window.outerHeight,
    0.05
  );
  document.body.style.backgroundPositionY = pos + "%";
}, 1000.0 / 60.0);
