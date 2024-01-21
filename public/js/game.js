// Chat
const input = document.getElementById("message_input");
const messages = document.getElementById("messages");
const send_message = document.getElementById("send_message");
const game_submit_button = document.getElementById("game_submit_button");
const game_submit_text = document.getElementById("game_submit_text");

// Guess
const guess_container = document.getElementById("guess");
const spy_guess = document.getElementById("spy_guess");
const guess_user = document.getElementById("guess_user");
const guess_message = document.getElementById("guess_message");
const guess_word = document.getElementById("guess_word");
const guess_count = document.getElementById("guess_count");
const guess_submit = document.getElementById("guess_submit");

const game_player_turn = document.getElementById("game_player_turn");

// Header
const header_red_detectives = document.getElementById("header_red_detectives");
const header_red_spies = document.getElementById("header_red_spies");
const header_blue_detectives = document.getElementById(
  "header_blue_detectives"
);
const header_blue_spies = document.getElementById("header_blue_spies");

const game_header_red_words_left = document.getElementById(
  "game_header_red_words_left"
);

const game_header_blue_words_left = document.getElementById(
  "game_header_blue_words_left"
);

var cards_button = [];
let game_ended = false;

function updateWords(colors, revealed_index) {
  for (let i = 0; i < 25; i++) {
    switch (colors[i]) {
      case 0:
        cards_button[i].style.color = "black";
        break;
      case 1:
        cards_button[i].style.background = "var(--red-bg)";
        break;
      case 2:
        cards_button[i].style.background = "var(--blue-bg)";
        break;
      case 3:
        cards_button[i].style.backgroundColor = "black";
        cards_button[i].style.color = "white";
        break;
      default:
        break;
    }
  }

  let cards_filename = ["normal", "red", "blue", "black"];

  revealed_index.forEach((index) => {
    cards_button[index].disabled = true;
    cards_button[index].className = "revealed";
    cards_button[index].style.background =
      "url('../images/" +
      cards_filename[colors[index]] +
      "_card.png') center / cover no-repeat";
  });
}

function canPlay(turn, winner = 0) {
  return (
    ((turn === Turns.RedSpies && team === Teams.Red && role === Roles.Spy) ||
      (turn === Turns.RedDetectives &&
        team === Teams.Red &&
        role === Roles.Detective) ||
      (turn === Turns.BlueSpies && team === Teams.Blue && role === Roles.Spy) ||
      (turn === Turns.BlueDetectives &&
        team === Teams.Blue &&
        role === Roles.Detective)) &&
    winner === 0
  );
}

socket.on("game_started", (data) => {
  game_ended = false;
  messages.innerHTML = ""; // clear messages
  switchScreen(Screens.Game);
});

socket.on("return_to_lobby", () => {
  switchScreen(Screens.Lobby);
});

function submitPressed() {
  if (game_ended) {
    socket.emit("return_to_lobby");
    return;
  }
  if (role === Roles.Detective) {
    socket.emit("end_detective_turn");
  } else if (role === Roles.Spy) {
    if (guess_word.value) {
      socket.emit("guess_message", {
        word: guess_word.value,
        count: guess_count.value,
      });
    }
  }
}

socket.on("log", (msg) => {
  const item = document.createElement("li");
  item.innerHTML = msg;
  messages.appendChild(item);
  messages.scroll(0, messages.scrollHeight);
});

socket.on("guess_message", (guess) => {
  document.getElementById("guess").style.display = "block";
  document.getElementById("guess_user").innerText = guess.username + " dit:";
  document.getElementById("guess_message").innerHTML =
    "<span>" + guess.word + "</span> en <span>" + guess.count + "</span>";
});

function addUsersToUl(array, ul_tag) {
  ul_tag.innerHTML = "";
  array.forEach((user) => {
    var li = document.createElement("li");
    li.innerText = user.username;
    ul_tag.appendChild(li);
  });
}

function updateHeader(users_keys, words_left) {
  addUsersToUl(
    users_keys.filter(
      (user) => user.role === Roles.Detective && user.team === Teams.Red
    ),
    header_red_detectives
  );
  addUsersToUl(
    users_keys.filter(
      (user) => user.role === Roles.Spy && user.team === Teams.Red
    ),
    header_red_spies
  );
  addUsersToUl(
    users_keys.filter(
      (user) => user.role === Roles.Detective && user.team === Teams.Blue
    ),
    header_blue_detectives
  );
  addUsersToUl(
    users_keys.filter(
      (user) => user.role === Roles.Spy && user.team === Teams.Blue
    ),
    header_blue_spies
  );

  game_header_red_words_left.innerText = words_left.red;
  game_header_blue_words_left.innerText = words_left.blue;
}

socket.on("update_game", (data) => {
  var userData = data.users[socket.id];
  role = userData.role;
  team = userData.team;

  updateHeader(Object.values(data.users), data.words_left);

  let cardsGrid = document.getElementById("cards_grid");
  cardsGrid.innerHTML = "";
  cards_button = [];

  var sound = new Howl({
    src: ["audios/card_hover.mp3"],
  });

  for (let i = 0; i < 25; i++) {
    var cardBtn = document.createElement("button");
    cardBtn.innerText = data.words[i];
    cardBtn.addEventListener("click", (e) => {
      e.preventDefault();
      socket.emit("word_pressed", i);
    });
    cardBtn.addEventListener("mouseover", (e) => {
      sound.play();
    });
    cardsGrid.appendChild(cardBtn);
    cards_button.push(cardBtn);
  }

  updateWords(data.colors, data.revealed_words);
  if (data.turn === Turns.BlueSpies || data.turn === Turns.RedSpies) {
    guess_container.style.display = "none";
  }

  document.body.style.backgroundColor =
    userData.team === Teams.Red ? "#c3212a" : "#2154c3";

  let can_play = canPlay(data.turn, data.winner);
  game_player_turn.style.display =
    can_play || data.winner !== 0 ? "inherit" : "none";
  spy_guess.style.display = role === Roles.Spy && can_play ? "inherit" : "none";

  if (role === Roles.Detective) {
    game_player_turn.innerText =
      "Vous pouvez encore révéler " + data["plays_left"] + " cartes.";
  } else {
    game_player_turn.innerText = "C'est votre tour!";
    guess_word.value = "";
    guess_count.value = "1";
  }

  if (data.winner !== 0) {
    game_ended = true;
    game_player_turn.innerText =
      "Partie terminée! Les " +
      (data.winner === 1 ? "rouges" : "bleues") +
      " ont gagnés.";
    game_submit_text.innerHTML = "RETOUR AU LOBBY";
    game_submit_button.style.display = "inherit";
  } else {
    game_submit_text.innerHTML =
      role === Roles.Spy ? "FAIRE DEVINER" : "TERMINER LE TOUR";
    game_submit_button.style.display = can_play ? "inherit" : "none";
  }
});
