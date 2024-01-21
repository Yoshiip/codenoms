const menu_username = document.getElementById("menu_username");
const menu_room_code = document.getElementById("menu_room_code");
const menu_public_games = document.getElementById("menu_public_games");

const lobby_name = document.getElementById("lobby_name");

let username = "";

/**
 * @param {string} name
 */
function isUsernameValid(name) {
  return name.length >= 1 && name.length <= 16;
}

var enterFunc = (e) => {
  if (e.key == "Enter") {
    submitName();
  }
};

function submitName() {
  if (isUsernameValid(menu_username.value)) {
    username = menu_username.value;
    screenChangeToMenu();
  } else {
    alert("Nom d'utilisateur invalide!");
  }
}

function menuHostGame() {
  switchScreen(Screens.Lobby);
  socket.emit("host_game", username);
}

function menuJoinGame() {
  socket.emit("join_game", {
    username: username,
    room_id: menu_room_code.value,
  });
  switchScreen(Screens.Lobby);
}

socket.on("public_games", (games) => {
  if (Object.keys(games).length == 0) {
    return;
  }
  menu_public_games.innerHTML = "";
  games.forEach((game) => {
    var li = document.createElement("li");
    var p = document.createElement("p");
    p.innerText =
      "Salon de " +
      game["users"][game.admin].username +
      " (" +
      Object.keys(game["users"]).length +
      " joueurs)";
    var btn = document.createElement("button");
    btn.innerText = "Rejoindre";
    btn.addEventListener("click", (e) => {
      menu_room_code.value = game.room_id;
      menuJoinGame();
    });
    li.appendChild(p);
    li.appendChild(btn);
    menu_public_games.appendChild(li);
  });
});

function screenChangeToName() {
  switchScreen(Screens.Name);
  menu_username.innerText = username;
  menu_username.focus();
  addEventListener("keypress", enterFunc);
}

function screenChangeToMenu() {
  switchScreen(Screens.Menu);
  removeEventListener("keypress", enterFunc);
  lobby_name.innerText = username;
}

screenChangeToName();

getPublicGames();

function getPublicGames() {
  socket.emit("get_public_games");
}
