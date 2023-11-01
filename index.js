// TODO
// [x] Make the display look nice
// [x] Allow rolling dice
// [x] Allow typing words
// [ ] Allow submitting words
// [ ] Add completed words to scoring area
// [ ] Add a timer
// [ ] Add "next round" button after the previous round

// [ ] Score words as you go
// [ ] Add a cumulative score

// [ ] Add a word list

// [ ] Allow cancelling words somehow (press enter?)
// [ ] Allow pressing backspace

// [ ] Animate dice movement

// [ ] Add mouse/touchpad support

// [ ] Add sound effects: word correct, word incorrect, all 5 words done, time out, time almost out, game start (dice rolling)

const DICE = [
    // Black dice
    "AAAEEE",
    "AAAEEE",
    "PINFUT",
    "BITKRH",
    "MUGRIS",
    "FRSHIU",
    "RODNLT",
    "JZEQXV",
    "POCMOW",
    "LOBYOW",
    // Red dice 
    "SWVSYQ",
    "CJKFGM",
    "BLHPFN",
];
const NUM_DICE = [10, 13]; // Non-vulnerable, vulnerable
const MIN_LENGTH = [3, 4]; // Non-vulnerable, vulnerable
const MAX_WORDS = 5; // Max of any one length
const MAX_WORD_LENGTH = 10;
const TIMER_MAX = 180;

const SCORES = {
    3: [0, 60, 70, 80, 90, 100],
    4: [0, 120, 140, 160, 180, 200],
    5: [0, 200, 250, 300, 350, 400],
    6: [0, 300, 400, 500, 600, 700],
    7: [0, 500, 650, 800, 950, 1100],
    8: [0, 750, 1000, 1250, 1500, 1750],
    9: [0, 1000, 1500, 2000, 2500, 3000],
    10: [0, 1500, 3000, 5000, 5000, 5000],
};
const SCORE_BONUS = [
    0, 0, 0, 0,
    300, // 3+4 letter words
    500, // 4+5 letter words
    800, // 5+6 letter words
    1200, // 6+7 letter words
    1850, // 7+8 letter words
    0, 0,
];

const VULNERABLE = 2000;
const VICTORY = 5000;

class Game {
    constructor() {
        this.vulnerable = 0;
        this.gameScore = 0;
    }
    rollDie(i) {
        const side = Math.floor(Math.random()*6); // 0-5
        return DICE[i][side];
    }
    rollDice() {
        this.roundScore = 0;
        this.words = [[], [], [], [], [], [], [], [], [], [], []]; // Length 0-10
        this.pool = [];
        this.spelled = [];

        $(".dice").empty();
        for (var i=0; i<NUM_DICE[this.vulnerable]; i++) {
            const roll = this.rollDie(i);
            const die = this.makeDie(roll, i>=NUM_DICE[0]);
            this.pool.push(die);
            this.addDie(die, $(".dice"));
        }

        window.setTimeout(TIMER_MAX*1000, this.roundOver.bind(this));
        this.updater = window.setInterval(100, this.updateTimer.bind(this));
        $(".roll-dice").hide();
        $(".spelling").show();
    }
    makeDie(letter, vulnerable) {
        const div = $(`<div class="die">${letter}</div>`)
        div.toggleClass("vulnerable", vulnerable);
        div.letter = letter;
        return div;
    }
    addDie(die, toDiv) {
        toDiv.append(die);
    }
    moveDie(die, toDiv) {
        toDiv.append(die);
    }
    validWord(word) {
        // Check if word is submitted already
        // Check if word is in wordlist.txt
        // Check for plurals
        // Check word length
        // Check if there are 5 words of the given length already
        return true;
    }
    trySpell(word) {
        var word = [];
        for (var i=0; i<this.spelled.length; i++) word.push(this.spelled.letter);
        word = word.join("");

        this.returnLetters();

        if (this.validWord(word)) this.spell(word);
    }
    spell(word) {
        this.words[word.length].push(word);
        this.updateScore();
    }
    updateTimer() {
        // TODO
    }
    updateScore(roundOver) {
        // TODO
        if (roundOver) {
            this.gameScore += this.roundScore;
            this.vulnerable = this.gameScore >= VULNERABLE;
            $(".vulnerable").toggle(this.vulnerable);
            if (this.gameScore >= VICTORY) this.victory();
        }
    }
    victory() {
        $(".roll-dice").hide();
        $(".victory").show();
    } 
    poolRemove(die) {
        const i = this.pool.indexOf(die);
        this.pool.splice(i, 1);
    }
    poolHas(letter) {
        for (var die of this.pool) {
            if (die.letter == letter) return die;
        }
        return false;
    }
    letterPressed(letter) {
        var die;
        if (letter=="ENTER") {
            this.clearProblem();
            this.trySpell();
        } else if (die = this.poolHas(letter)) {
            this.clearProblem();
            this.poolRemove(die);
            this.moveDie(die, $(".spelling"));
            this.spelled.push(die);
        } else {
            this.reportProblem("No letter " + letter);
        }
    }
    roundOver() {
        window.cancelInterval(this.updater); this.updater = null;
        $(".roll-dice").show();
        $(".spelling").hide();
        this.updateScore(1);
    }
    reportProblem(problem) {
        $(".problem").show();
        $(".problem").text(problem);
    }
    clearProblem() {
        $(".problem").hide();
    }
}

$(document).ready((ev) => {
    game = new Game();
    $(".roll-dice").on("click", game.rollDice.bind(game));

    document.addEventListener('keypress', (event) => {
        var name = event.key;
        game.letterPressed(event.key.toUpperCase());
    }, false);
});
