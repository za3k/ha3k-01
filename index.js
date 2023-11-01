// TODO
// [x] Make the display look nice
// [x] Allow rolling dice
// [x] Allow typing words
// [x] Allow submitting words
// [x] Add a timer
// [x] Add "next round" button after the previous round
// [x] Add completed words to scoring area
// [X] Allow cancelling words somehow (press enter?)

// [ ] Score words as you go
// [ ] Add a cumulative score

// [ ] Add a word list

// [ ] Allow pressing backspace

// [ ] Animate dice movement

// [ ] Add mouse/touchpad support

// [ ] Add sound effects: word correct, word incorrect, all 5 words done, time out, time almost out, game start (dice rolling)
// [ ] Visually indicate "complete" columns and that 3-letter words are forbidden when vulnerable

const DICE = [
    // Black dice
    "AAAEEE",
    "AAAEEE",
    "BHIKRT",
    "BLOOWY",
    "CMOOPW",
    "DLNORT",
    "EJQVXZ",
    "FHIRSU",
    "FINPTU",
    "GIMRSU",
    // Red dice 
    "BFHLNP",
    "CFGJKM",
    "SSQVWY",
];
const NUM_DICE = [10, 13]; // Non-vulnerable, vulnerable
const MIN_LENGTH = [3, 4]; // Non-vulnerable, vulnerable
const MAX_WORDS = 5; // Max of any one length
const MAX_WORD_LENGTH = 10;
const ROUND_TIME = 180;

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

KEY_BLACKLIST = ["META", "SHIFT", "CONTROL", "ALT", " ", "'", "ARROWUP", "ARROWDOWN", "ARROWLEFT", "ARROWRIGHT"];

function timeFormat(t) {
    const minutes = Math.floor(t / 60);
    const seconds = Math.ceil(t - minutes*60);
    return `${minutes.toString().padStart(1, '0')}:${seconds.toString().padStart(2, '0')}`
}
function time() { return new Date().getTime() / 1000; }

class DiceCollection {
    constructor(div) {
        this.dice = [];
        this.div = div;
    }
    add(letter, extraClasses) {
        const div = $(`<div class="die">${letter}</div>`)
        for (var class_ of extraClasses) div.addClass(class_);
        div.letter = letter;
        this.div.append(div);
        this.dice.push(div);
        return div;
    }
    has(letter, last) {
        for (var die of (last ? this.dice.slice().reverse() : this.dice)) {
            if (die.letter == letter) {
                const i = last ? this.dice.lastIndexOf(die) : this.dice.indexOf(die);
                return [die, i];
            }
        }
        return false;
    }
    move(letter, toCollection, toEnd) {
        if (!this.has(letter)) throw "No die found, expected to find that letter.";
        const [die, i] = this.has(letter, toEnd);
        this.dice.splice(i, 1);

        if (toEnd) {
            toCollection.dice.push(die);
            toCollection.div.append(die); // TODO: Animate
        } else {
            toCollection.dice.unshift(die);
            toCollection.div.prepend(die); // TODO: Animate
        }
    }
    moveAll(toCollection, toEnd) {
        while (this.dice.length > 0) {
            this.move(this.dice[this.dice.length-1].letter, toCollection, toEnd);
        }
    }
    clear() {
        this.dice = [];
        this.div.empty();
    }
}

class Game {
    constructor() {
        this.vulnerable = 0;
        this.gameScore = 0;
        this.active = 0;
        this.pool = new DiceCollection($(".dice"));
        this.spelled = new DiceCollection($(".spelling"));
    }
    rollDie(i) {
        const side = Math.floor(Math.random()*6); // 0-5
        return DICE[i][side];
    }
    rollDice() {
        this.roundScore = 0;
        this.words = [[], [], [], [], [], [], [], [], [], [], []]; // Length 0-10
        this.pool.clear();
        this.spelled.clear();
        this.roundStart = time();
        this.clearProblem();
        this.active = 1;

        for (var i=0; i<NUM_DICE[this.vulnerable]; i++) {
            this.pool.add(this.rollDie(i), i>=NUM_DICE[0] ? ["vulnerable"] : []);
        }

        window.setTimeout(this.roundOver.bind(this), ROUND_TIME*1000);
        this.updater = window.setInterval(this.updateTimer.bind(this), 100);
        $(".roll-dice").hide();
        $(".spelling").show();
    }
    validWord(word) {
        if (word.length < MIN_LENGTH[this.vulnerable] || word.length > MAX_WORD_LENGTH) {
            this.reportProblem(`${word.length}-letter words are not allowed`);
            return false;
        }
        if (this.words[word.length].length >= MAX_WORDS) {
            this.reportProblem(`You have found as many ${word.length}-letter words as needed.`);
            return false;
        }
        for (var existing of this.words[word.length]) {
            if (existing === word) {
                this.reportProblem("You have already submitted that word.");
                return false;
            }
            if (word + "s" == existing || word == existing + "s") {
                this.reportProblem("You can't submit both a singular and +s plural of the same word.");
                return false;
            }
        }
        // TODO: Check if word is in wordlist.txt
        return true;
    }
    trySpell(word) {
        var word = [];
        for (var i=0; i<this.spelled.dice.length; i++) word.push(this.spelled.dice[i].letter);
        word = word.join("");

        this.spelled.moveAll(this.pool, 0); // return all letters to start

        if (this.validWord(word)) {
            this.words[word.length].push(word);
            $(`.word-columns .word-column:nth-child(${word.length-2})`).append($(`<div class="word">${word}</div>`)).toggleClass("done", this.words[word.length].length == MAX_WORDS);
            // If it has 5 children, highlight it in a special color
            this.updateScore();
        }
    }
    updateTimer() {
        this.timeLeft = Math.max(this.roundStart + ROUND_TIME - time(), 0);
        $(".time").text(timeFormat(this.timeLeft))
    }
    updateScore(roundOver) {
        // TODO
        if (roundOver) {
            this.gameScore += this.roundScore;
            this.vulnerable = 0+(this.gameScore >= VULNERABLE);
            $(".vulnerable").toggle(this.vulnerable);
            if (this.gameScore >= VICTORY) this.victory();
        }
    }
    victory() {
        $(".roll-dice").hide();
        $(".victory").show();
    } 
    letterPressed(letter) {
        var die;
        if (!this.active) return;
        if (letter=="ENTER") {
            this.clearProblem();
            this.trySpell();
        } else if (this.pool.has(letter)) {
            this.clearProblem();
            this.pool.move(letter, this.spelled, 1); // To the end
        } else {
            this.reportProblem(`No letter ${letter}`);
        }
    }
    roundOver() {
        window.clearInterval(this.updater); this.updater = null;
        this.clearProblem();
        $(".roll-dice").show();
        $(".spelling").hide();
        $(".time").text("--");
        this.updateScore(1);
        this.active = 0;
    }
    reportProblem(problem) {
        $(".problem").text(problem).show();
    }
    clearProblem() {
        $(".problem").text("").hide();
    }
}

$(document).ready((ev) => {
    game = new Game();
    $(".roll-dice").on("click", game.rollDice.bind(game));

    document.addEventListener('keydown', (event) => {
        var name = event.key.toUpperCase();
        if (KEY_BLACKLIST.indexOf(name) >=0 ) return;
        game.letterPressed(name);
    }, false);
});
