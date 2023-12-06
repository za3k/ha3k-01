// [ ] Animate dice movement
// [ ] Add mouse/touchpad support
// [ ] Add sound effects: word correct, word incorrect, all 5 words done, time out, time almost out, game start (dice rolling)

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

        div.on("click", (event) => {
            if ($(event.target).parent().hasClass("dice")) {
                game.letterPressed(div.letter);
            }
        });

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
    counts(letter) {
        var count = {};
        for (var letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") count[letter] = 0;
        for (var die of this.dice) count[die.letter]++;
        return count;
    }
    move(letter, toCollection, fromEnd, toEnd) {
        if (!this.has(letter)) throw "No die found, expected to find that letter.";
        const [die, i] = this.has(letter, fromEnd);
        this.dice.splice(i, 1);

        if (toEnd) {
            toCollection.dice.push(die);
            toCollection.div.append(die); // TODO: Animate
        } else {
            toCollection.dice.unshift(die);
            toCollection.div.prepend(die); // TODO: Animate
        }
    }
    moveAll(toCollection, fromEnd, toEnd) {
        while (this.dice.length > 0) {
            this.move(this.dice[fromEnd ? this.dice.length-1 : 0].letter, toCollection, fromEnd, toEnd);
        }
    }
    isEmpty() {
        return this.dice.length == 0;
    }
    last() {
        return this.dice[this.dice.length-1].letter;
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
        this.roundNumber = 0;
    }
    rollDie(i) {
        const side = Math.floor(Math.random()*6); // 0-5
        return DICE[i][side];
    }
    reset() {
        this.roundScore = 0;
        this.words = [[], [], [], [], [], [], [], [], [], [], [], []]; // Length 0-11
        this.pool.clear();
        this.spelled.clear();
        this.clearProblem();
        $(".roll-dice").hide();
        $(".spelling").show();
        $(".spelling-buttons").show();
        $(".bonus").hide();
        $(".done").removeClass("done");
        $(".word").remove();
    }
    rollDice() {
        this.reset();
        this.roundStart = time();
        this.active = 1;
        $(".round").text(++this.roundNumber);

        for (var i=0; i<NUM_DICE[this.vulnerable]; i++) {
            this.pool.add(this.rollDie(i), i>=NUM_DICE[0] ? ["vulnerable"] : []);
        }

        $(`.word-columns .word-column:nth-child(1)`).toggleClass("vulnerable", !!this.vulnerable);

        window.setTimeout(this.roundOver.bind(this), ROUND_TIME*1000);
        this.updater = window.setInterval(this.updateTimer.bind(this), 100);
        this.updateScore()
    }
    validWord(word) {
        if (word.length < MIN_LENGTH[this.vulnerable] || word.length > MAX_WORD_LENGTH) {
            this.reportProblem(`${word.length}-letter words are not allowed`);
            return false;
        }
        for (var existing of this.words[word.length]) {
            if (existing === word) {
                this.reportProblem("You have already submitted that word.");
                return false;
            }
        }
        if (!dictionary[word]) {
            this.reportProblem("That word was not found in our dictionary.");
            return false;
        }
        if (this.words[word.length].length >= MAX_WORDS) {
            this.reportProblem(`You have found as many ${word.length}-letter words as needed.`);
            return false;
        }
        for (var existing of this.words[word.length-1]) {
            if (word === existing + "S") {
                this.reportProblem("You can't submit both a singular and +s plural of the same word.");
                return false;
            }
        }
        for (var existing of this.words[word.length+1]) {
            if (word + "S" === existing) {
                this.reportProblem("You can't submit both a singular and +s plural of the same word.");
                return false;
            }
        }
        return true;
    }
    returnLetters() {
        this.spelled.moveAll(this.pool, 1, 0); // return all letters to start
    }
    count(letter, word) {
        return word.split(letter).length - 1;
    }
    trySpell(word) {
        var word = [];
        for (var i=0; i<this.spelled.dice.length; i++) word.push(this.spelled.dice[i].letter);
        word = word.join("");

        this.returnLetters();

        if (this.validWord(word)) {
            this.words[word.length].push(word);
            $(`.word-columns .word-column:nth-child(${word.length-2})`)
                .append($(`<div class="word">${word}</div>`))
                .toggleClass("done", this.words[word.length].length == MAX_WORDS); // If it has 5 children, highlight it in a special color
            this.updateScore();
        }
    }
    updateTimer() {
        this.timeLeft = Math.max(this.roundStart + ROUND_TIME - time(), 0);
        $(".time").text(timeFormat(this.timeLeft))
    }
    updateScore(roundOver) {
        let score = 0;
        this.roundScore = 0;
        for (var l=MIN_LENGTH[this.vulnerable]; l<=MAX_WORD_LENGTH; l++) {
            const wordScore = SCORES[l][this.words[l].length];
            $(`.word-columns .word-column:nth-child(${l-2}) .word-score`).text(wordScore);
            this.roundScore += wordScore;
            if (this.words[l-1].length == MAX_WORDS && this.words[l].length == MAX_WORDS) {
                $(`.words-${l-1}-${l}`).show();
                this.roundScore += SCORE_BONUS[l];
            }
        }
        if (!!this.vulnerable) {
            $(".under-500").toggle(this.roundScore < 500);
            if (this.roundScore < 500) this.roundScore -= 500;
        }
        $(".round-score").text(this.roundScore);

        if (roundOver) {
            this.gameScore += this.roundScore;
            this.vulnerable = 0+(this.gameScore >= VULNERABLE);
            $(".vulnerable-label").toggle(this.vulnerable);
            $(".game-score").text(this.gameScore).toggleClass("vulnerable", !!this.vulnerable);
            if (this.gameScore >= VICTORY) this.victory();
        }
    }
    victory() {
        $(".roll-dice").hide();
        $(".victory").show().text(`You win! You scored ${this.gameScore} points in ${this.roundNumber} rounds`);
    } 
    letterPressed(letter) {
        var die;
        if (!this.active) return;
        if (letter=="ENTER") {
            this.clearProblem();
            this.trySpell();
        } else if (letter=="BACKSPACE" || letter=="DELETE") {
            this.clearProblem();
            if (this.spelled.isEmpty()) return;
            const lastLetter = this.spelled.last();
            this.spelled.move(lastLetter, this.pool, 1, 0); // Undo!
        } else if (this.pool.has(letter)) {
            this.clearProblem();
            this.pool.move(letter, this.spelled, 0, 1); // From the start of the pool, to the end of the spelled word
        } else {
            this.reportProblem(`No letter ${letter}`);
        }
    }
    usesLetters(word, counts) {
        for (var letter of word) {
            if (this.count(letter, word) > counts[letter]) return false;
        }
        return true;
    }
    revealAnswers() {
        var letterCounts = this.pool.counts();

        // Reveal any words they didn't get
        for (var l=MIN_LENGTH[this.vulnerable]; l<=MAX_WORD_LENGTH; l++) {
            var remaining = MAX_WORDS - this.words[l].length;
            for (var word in dictionary) {
                if (word.length != l) continue;
                if (!this.usesLetters(word, letterCounts)) continue;
                if (!this.validWord(word)) continue;
                $(`.word-columns .word-column:nth-child(${word.length-2})`)
                    .append($(`<div class="word revealed">${word}</div>`));
                if (! --remaining) break;
            }
        }
            
    }
    roundOver() {
        window.clearInterval(this.updater); this.updater = null;
        this.clearProblem();
        this.returnLetters();
        this.revealAnswers();
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

    $(".spelling-ok").on("click", (event) => {
        game.letterPressed("ENTER");
    });
    $(".spelling-undo").on("click", (event) => {
        game.letterPressed("BACKSPACE");
    });
});
