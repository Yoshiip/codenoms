const lobby_players_list = document.getElementById("lobby_players_list");
const lobby_room_id = document.getElementById("lobby_room_id");
const lobby_start_button = document.getElementById("lobby_start_button");

const lobby_role_select = document.getElementById("lobby_role_select");
const lobby_team_select = document.getElementById("lobby_team_select");

const lobby_room_name = document.getElementById("lobby_room_name");

// buttons groups
const lobby_detective_btn_grp = document.getElementById(
  "lobby_detective_btn_grp"
);
const lobby_spy_btn_grp = document.getElementById("lobby_spy_btn_grp");
const lobby_red_btn_grp = document.getElementById("lobby_red_btn_grp");
const lobby_blue_btn_grp = document.getElementById("lobby_blue_btn_grp");
const lobby_fr_btn_grp = document.getElementById("lobby_fr_btn_grp");
const lobby_en_btn_grp = document.getElementById("lobby_en_btn_grp");

function updatePlayers(players) {
  lobby_players_list.innerHTML = "";
  Object.values(players).forEach((player) => {
    var element = document.createElement("li");
    // btn.addEventListener("click", (e) => {
    //   socket.emit("switch_player_team", {
    //     room_id: room_id,
    //     socket_id: Object.keys(players)[Object.values(players).indexOf(player)],
    //   });
    // });
    switch (player.team) {
      case Teams.Red:
        element.style.background = "var(--red-bg)";
        element.style.color = "black";
        break;
      case Teams.Blue:
        element.style.background = "var(--blue-bg)";
        element.style.color = "white";
        break;
      default:
        element.style.backgroundColor = "gray";
        element.style.color = "black";
        break;
    }
    element.innerText = player.username;
    switch (player.role) {
      case Roles.Detective:
        element.innerText += " (Détective)";
        break;
      case Roles.Spy:
        element.innerText += " (Espion)";
        break;
      default:
        break;
    }
    lobby_players_list.appendChild(element);
  });
}

socket.on("quit_room", (event) => {
  switchScreen(Screens.Menu);
});

function quitGame() {
  socket.emit("quit_room");
  switchScreen(Screens.Menu);
}

function lobbyCopyRoomID() {
  lobby_room_id.select();
  lobby_room_id.setSelectionRange(0, 6);
  navigator.clipboard.writeText(lobby_room_id.value);
}

socket.on("update_lobby", (data) => {
  room_id = data.room_id;
  lobby_room_id.value = data.room_id;
  players = data.users;

  lobby_room_name.innerText =
    "Salon de " + data["users"][data["admin"]].username;

  let is_admin = data["admin"] === socket.id;

  Array.from(document.getElementsByClassName("admin_only")).forEach(
    (element) => {
      element.style.display = is_admin ? "inherit" : "none";
    }
  );

  updatePlayers(players);
});

function lobbyStartGame() {
  if (
    Object.values(players).length >= 4 ||
    confirm(
      "Le jeu est jouable à partir de 4 joueurs. Souhaitez-vous quand même continuer ?"
    )
  ) {
    socket.emit("start_game");
  }
}

function lobbyTeamChanged() {
  socket.emit("player_switch_team", {
    new_team: lobby_team_select.value == 1 ? Teams.Red : Teams.Blue,
  });
}

function lobbyRoleChanged() {
  socket.emit("player_switch_role", {
    new_role: lobby_role_select.value == 1 ? Roles.Detective : Roles.Spy,
  });
}

function SetRoleSpy() {
  role = Roles.Spy;
  socket.emit("player_switch_role", role);
  updateButtonGroups();
}

function SetRoleDetective() {
  role = Roles.Detective;
  socket.emit("player_switch_role", role);
  updateButtonGroups();
}

function SetTeamRed() {
  team = Teams.Red;
  socket.emit("player_switch_team", team);
  updateButtonGroups();
}

function SetTeamBlue() {
  team = Teams.Blue;
  socket.emit("player_switch_team", team);
  updateButtonGroups();
}

socket.on("update_player", (data) => {
  team = data.team;
  role = data.role;
  socket.emit("player_switch_role", role);
  socket.emit("player_switch_team", team);
  updateButtonGroups();
});

function updateToggleButton(button, is_selected) {
  if (!button.classList.contains("selected") && is_selected) {
    button.classList.add("selected");
  } else if (!is_selected) {
    button.classList.remove("selected");
  }
}

function SetLang(lang) {
  this.lang = lang;
  socket.emit("set_lang", lang);
  updateButtonGroups();
}

function updateButtonGroups() {
  updateToggleButton(lobby_detective_btn_grp, role === Roles.Detective);
  updateToggleButton(lobby_spy_btn_grp, role === Roles.Spy);
  updateToggleButton(lobby_red_btn_grp, team === Teams.Red);
  updateToggleButton(lobby_blue_btn_grp, team === Teams.Blue);

  updateToggleButton(lobby_fr_btn_grp, lang === "fr");
  updateToggleButton(lobby_en_btn_grp, lang === "en");
}

function changedSceneToLobby() {
  updateButtonGroups();
}
