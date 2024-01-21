import express from "express";
import repl from "repl";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import * as fs from "fs";
import { Socket } from "node:dgram";

const app = express();
const server = createServer(app);
const io = new Server(server);
const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

app.use(express.static("public"));

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

const NORMAL = 0;
const RED = 1;
const BLUE = 2;
const BLACK = 3;

function getRandomWords(room_id) {
  let lang = rooms_alives[room_id]["lang"];
  if (!(lang === "fr" || lang === "en")) {
    return;
  }
  var words_file = fs.readFileSync("words_" + lang + ".txt", "utf-8");
  var words_array = words_file.split(/\r?\n/);
  var words = [];
  while (words.length < 25) {
    var random_word =
      words_array[Math.floor(Math.random() * words_array.length)];
    if (!words.includes(random_word)) {
      words.push(random_word);
    }
  }
  return words;
}

/**
 *
 * @param {array} array
 * @param {number} value
 * @param {number} minimum
 * @returns
 */
function fillWithMin(array, value, minimum) {
  while (array.filter((x) => x === value).length !== minimum) {
    let random = Math.floor(Math.random() * array.length);
    if (array[random] === NORMAL) {
      array[random] = value;
    }
  }
  return array;
}

function generateColorsMap() {
  var colors_map = new Array(25).fill(NORMAL);
  colors_map = fillWithMin(colors_map, RED, 9);
  colors_map = fillWithMin(colors_map, BLUE, 8);
  colors_map = fillWithMin(colors_map, BLACK, 1);

  return colors_map;
}

/**
 * Generate a random room id of 5 letters
 * @returns The room id
 */
function randomRoomID() {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < 5) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return Object.keys(rooms_alives).includes(result) ? randomRoomID : result;
}

var rooms_alives = {};

/**
 * Add user to the current room_id
 * @param {string} room_id
 * @param {string} socket_id
 * @param {string} username
 */
function addUser(room_id, socket_id, username) {
  rooms_alives[room_id]["users"][socket_id] = {
    username: username,
    team: Teams.None,
    role: Roles.None,
  };
}

/**
 *  Return the socket role (detective or spy)
 * @param {Socket} socket
 * @returns The socket role
 */
function getSocketRole(socket) {
  return rooms_alives[getSocketRoom(socket)]["users"][socket.id].role;
}

/**
 * Return the socket team (red or blue)
 * @param {Socket} socket
 * @returns The socket team
 */
function getSocketTeam(socket) {
  return rooms_alives[getSocketRoom(socket)]["users"][socket.id].team;
}

/**
 * Used to tell if the socket is allowed to play
 * @param {Socket} socket
 * @returns Return true if the socket can play, else false
 */
function canSocketPlay(socket) {
  var room_id = getSocketRoom(socket);
  var socket_role = getSocketRole(socket);
  var socket_team = getSocketTeam(socket);
  var turn = rooms_alives[room_id]["turn"];
  return (
    ((turn === Turns.RedSpies &&
      socket_team === Teams.Red &&
      socket_role === Roles.Spy) ||
      (turn === Turns.RedDetectives &&
        socket_team === Teams.Red &&
        socket_role === Roles.Detective) ||
      (turn === Turns.BlueSpies &&
        socket_team === Teams.Blue &&
        socket_role === Roles.Spy) ||
      (turn === Turns.BlueDetectives &&
        socket_team === Teams.Blue &&
        socket_role === Roles.Detective)) &&
    rooms_alives[room_id]["winner"] === 0 &&
    rooms_alives[room_id]["ingame"]
  );
}

/**
 * Filters the colors according to the revealed words, used for detectives to only show words known
 * @param {array} colorsArray
 * @param {array} revealed_words
 * @returns The colors filtered
 */
function filterColors(colorsArray, revealed_words) {
  let array = [];
  for (let i = 0; i < colorsArray.length; i++) {
    array.push(revealed_words.includes(i) ? colorsArray[i] : NORMAL);
  }
  return array;
}

/**
 *
 * @param {string} room_id
 * @returns
 */
function getWordsLeft(room_id) {
  let colors = rooms_alives[room_id]["colors"];
  let revealed = rooms_alives[room_id]["revealed_words"];

  let red = 9;
  let blue = 8;

  revealed.forEach((element) => {
    if (colors[element] === RED) {
      red--;
    } else if (colors[element] === BLUE) {
      blue--;
    }
  });

  return {
    red: red,
    blue: blue,
  };
}

/**
 *
 * @param {string} room_id
 */
function sendGameDataToSockets(room_id) {
  let users = rooms_alives[room_id]["users"];
  let users_key = Object.keys(users);
  let detectives = users_key.filter(
    (user) => users[user].role === Roles.Detective
  );
  let spies = users_key.filter((user) => users[user].role === Roles.Spy);

  let room_data = {
    words: rooms_alives[room_id]["words"],
    colors: rooms_alives[room_id]["colors"],
    users: users,
    winner: rooms_alives[room_id]["winner"],
    plays_left: rooms_alives[room_id]["plays_left"],
    revealed_words: rooms_alives[room_id]["revealed_words"],
    turn: rooms_alives[room_id]["turn"],
    words_left: getWordsLeft(room_id),
  };

  io.to(spies).emit("update_game", room_data);

  room_data["colors"] = filterColors(
    room_data["colors"],
    room_data["revealed_words"]
  );
  io.to(detectives).emit("update_game", room_data);
}

/**
 *
 * @param {Socket} socket
 * @returns
 */
function getSocketRoom(socket) {
  return Array.from(socket.rooms)[1];
}

function getRoleAndTeamFewestPeople(room_id) {
  let users_list = Object.values(rooms_alives[room_id]["users"]);
  let role = getRoleFewestPeople(room_id);

  let red_count = 0,
    blue_count = 0;
  users_list.forEach((user) => {
    if (user.role === role) {
      red_count += user.team === Teams.Red ? 1 : 0;
      blue_count += user.team === Teams.Blue ? 1 : 0;
    }
  });
  return {
    team: red_count > blue_count ? Teams.Blue : Teams.Red,
    role: role,
  };
}

function getRoleFewestPeople(room_id) {
  let users_list = Object.values(rooms_alives[room_id]["users"]);
  let detectives_count = 0,
    spies_count = 0;
  users_list.forEach((user) => {
    detectives_count += user.role === Roles.Detective ? 1 : 0;
    spies_count += user.role === Roles.Spy ? 1 : 0;
  });
  return detectives_count > spies_count ? Roles.Spy : Roles.Detective;
}

/**
 *
 * @param {string} room_id
 */
function nextTurn(room_id) {
  var turn = rooms_alives[room_id]["turn"];
  var keys = Object.keys(Turns);
  rooms_alives[room_id]["turn"] = keys[(keys.indexOf(turn) + 1) % 4];
}

function initGame(room_id) {
  rooms_alives[room_id]["ingame"] = false;
  rooms_alives[room_id]["turn"] = Turns.RedSpies;
  rooms_alives[room_id]["lang"] = "fr";
  rooms_alives[room_id]["words"] = [];
  rooms_alives[room_id]["plays_left"] = 0;
  rooms_alives[room_id]["colors"] = [];
  rooms_alives[room_id]["winner"] = 0;
  rooms_alives[room_id]["revealed_words"] = [];
}

io.on("connection", (socket) => {
  socket.on("get_public_games", () => {
    socket.emit(
      "public_games",
      Object.values(rooms_alives).filter((room) => !room.ingame)
    );
  });

  //    __  __
  //   |  \/  |
  //   | \  / | ___ _ __  _   _
  //   | |\/| |/ _ \ '_ \| | | |
  //   | |  | |  __/ | | | |_| |
  //   |_|  |_|\___|_| |_|\__,_|
  //
  //
  socket.on("host_game", (username) => {
    var room_id = randomRoomID();
    rooms_alives[room_id] = {
      room_id: room_id,
      users: {},
      admin: socket.id,
    };
    initGame(room_id);

    addUser(room_id, socket.id, username);

    socket.emit("update_player", getRoleAndTeamFewestPeople(room_id));

    socket.join(room_id);
    io.to(room_id).emit("update_lobby", rooms_alives[room_id]);
  });
  socket.on("join_game", (data) => {
    var room_id = data.room_id;
    if (Object.keys(rooms_alives).includes(room_id)) {
      if (rooms_alives[room_id]["ingame"]) {
        socket.emit("alert", "La partie est déjà lancée!");
        return;
      }
      socket.join(room_id);
      addUser(room_id, socket.id, data.username);

      socket.emit("update_player", getRoleAndTeamFewestPeople(room_id));
      io.to(room_id).emit("update_lobby", rooms_alives[room_id]);
    } else {
      socket.emit("alert", "La partie n'existe plu!");
      socket.emit("quit_game");
    }
  });
  //    _           _     _
  //   | |         | |   | |
  //   | |     ___ | |__ | |__  _   _
  //   | |    / _ \| '_ \| '_ \| | | |
  //   | |___| (_) | |_) | |_) | |_| |
  //   |______\___/|_.__/|_.__/ \__, |
  //                             __/ |
  //                            |___/
  socket.on("player_switch_team", (new_team) => {
    let room_id = getSocketRoom(socket);
    rooms_alives[room_id]["users"][socket.id].team = new_team;
    io.to(room_id).emit("update_lobby", rooms_alives[room_id]);
  });
  socket.on("player_switch_role", (new_role) => {
    let room_id = getSocketRoom(socket);
    rooms_alives[room_id]["users"][socket.id].role = new_role;
    io.to(room_id).emit("update_lobby", rooms_alives[room_id]);
  });
  socket.on("quit_room", () => {
    let room_id = getSocketRoom(socket);
    socket.leave(room_id);
    io.to(room_id).emit("update_lobby", rooms_alives[room_id]);
  });
  socket.on("set_lang", (new_lang) => {
    let room_id = getSocketRoom(socket);
    if (room_id && socket.id === rooms_alives[room_id]["admin"]) {
      rooms_alives[room_id]["lang"] = new_lang;
    }
  });
  //     _____
  //    / ____|
  //   | |  __  __ _ _ __ ___   ___
  //   | | |_ |/ _` | '_ ` _ \ / _ \
  //   | |__| | (_| | | | | | |  __/
  //    \_____|\__,_|_| |_| |_|\___|
  //
  //
  socket.on("start_game", () => {
    let room_id = getSocketRoom(socket);
    if (!room_id || socket.id !== rooms_alives[room_id].admin) {
      socket.emit("alert", "Seul l'administrateur peut lancer la partie!");
      return;
    }
    rooms_alives[room_id].ingame = true;
    rooms_alives[room_id]["words"] = getRandomWords(room_id);
    rooms_alives[room_id]["colors"] = generateColorsMap();
    io.to(room_id).emit("game_started", {});
    sendGameDataToSockets(room_id);
  });
  socket.on("guess_message", (data) => {
    let room_id = getSocketRoom(socket);
    if (room_id && canSocketPlay(socket)) {
      let username = rooms_alives[room_id]["users"][socket.id].username;
      rooms_alives[room_id]["plays_left"] = Number(data.count) + 1;
      io.emit(
        "log",
        "<strong>" +
          username +
          "</strong> fait deviner <strong>" +
          data.word +
          " en " +
          data.count +
          "</strong>."
      );
      data["username"] = username;
      io.to(room_id).emit("guess_message", data);
      nextTurn(room_id);
      sendGameDataToSockets(room_id);
    }
  });
  socket.on("word_pressed", (word_index) => {
    let room_id = getSocketRoom(socket);
    if (
      room_id &&
      canSocketPlay(socket) &&
      getSocketRole(socket) === Roles.Detective
    ) {
      if (rooms_alives[room_id]["plays_left"] == 0) {
        return;
      }
      let username = rooms_alives[room_id]["users"][socket.id].username;
      rooms_alives[room_id]["revealed_words"].push(word_index);
      io.emit(
        "log",
        "<strong>" +
          username +
          "</strong> appuie sur <span class='color c" +
          rooms_alives[room_id]["colors"][word_index] +
          "'>" +
          rooms_alives[room_id]["words"][word_index] +
          "</span>."
      );
      rooms_alives[room_id]["plays_left"]--;

      let card_color = rooms_alives[room_id]["colors"][word_index];
      if (card_color === BLACK) {
        rooms_alives[room_id].winner =
          getSocketTeam(socket) === Teams.Blue ? 1 : 2; // game over
      } else if (
        // wrong card
        (card_color === RED && getSocketTeam(socket) === Teams.Blue) ||
        (card_color === BLUE && getSocketTeam(socket) === Teams.Red) ||
        card_color === NORMAL ||
        rooms_alives[room_id]["plays_left"] === 0
      ) {
        nextTurn(room_id);
      }
      let words_left = getWordsLeft(room_id);
      if (words_left.red === 0) {
        rooms_alives[room_id].winner = RED;
      }
      if (words_left.blue === 0) {
        rooms_alives[room_id].winner = BLUE;
      }
      sendGameDataToSockets(room_id);
    }
  });
  socket.on("end_detective_turn", () => {
    let room_id = getSocketRoom(socket);
    if (room_id && canSocketPlay(socket)) {
      let username = rooms_alives[room_id]["users"][socket.id].username;
      io.emit("log", username + " termine le tour. ");
      nextTurn(room_id);
      sendGameDataToSockets(room_id);
    }
  });
  socket.on("return_to_lobby", () => {
    let room_id = getSocketRoom(socket);
    if (room_id && rooms_alives[room_id]["admin"] === socket.id) {
      io.to(room_id).emit("return_to_lobby");
      initGame(room_id);
      io.to(room_id).emit("update_lobby");
    }
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room_id) => {
      if (room_id.length === 5) {
        delete rooms_alives[room_id]["users"][socket.id];
        io.to(room_id).emit("player_disconnected", rooms_alives[room_id]);
        if (Object.keys(rooms_alives[room_id]["users"]).length === 0) {
          delete rooms_alives[room_id];
        }
      }
    });
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const replServer = repl.start("> ");
replServer.context.server = server;
replServer.context.app = app;

server.on("close", () => {
  replServer.close();
});
