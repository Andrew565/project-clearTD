const SUITS = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
const RANKS = [
    { nameRank: 'Ace', initial: 'A' },
    { nameRank: 'Two', initial: '2' },
    { nameRank: 'Three', initial: '3' },
    { nameRank: 'Four', initial: '4' },
    { nameRank: 'Five', initial: '5' },
    { nameRank: 'Six', initial: '6' },
    { nameRank: 'Seven', initial: '7' },
    { nameRank: 'Eight', initial: '8' },
    { nameRank: 'Nine', initial: '9' },
    { nameRank: 'Ten', initial: '10' },
    { nameRank: 'Jack', initial: 'J' },
    { nameRank: 'Queen', initial: 'Q' },
    { nameRank: 'King', initial: 'K' }
];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                suit: suit,
                nameRank: rank.nameRank,
                initial: rank.initial
            });
        }
    }
    // Add 2 Jokers
    deck.push({ suit: 'Joker', nameRank: 'Joker', initial: 'JK' });
    deck.push({ suit: 'Joker', nameRank: 'Joker', initial: 'JK' });
    return deck;
}

export class Game {
    constructor() {
        this.dungeon = [[], [], [], []]; // 4 columns
        this.powerDeck = [];
        this.hand = [];
        this.stagedCards = [[], [], [], []]; // 4 columns of staged cards
        this.discardPile = [];
        this.clearPile = [];
        this.gameState = 'SETUP'; // SETUP, DRAW, PLAY, GAME_OVER
        this.selectedCardIndex = null; // Single selection
        this.history = [];
    }

    setup() {
        this.dungeon = [[], [], [], []];
        this.stagedCards = [[], [], [], []];
        this.powerDeck = [];
        this.hand = [];
        this.discardPile = [];
        this.clearPile = [];
        this.selectedCardIndex = null;
        this.history = [];

        const allCards = createDeck();
        this.shuffleArray(allCards);

        const monsters = allCards.filter(c => ['Jack', 'Queen', 'King'].includes(c.nameRank));
        const powerCards = allCards.filter(c => !['Jack', 'Queen', 'King'].includes(c.nameRank));

        this.shuffleArray(monsters);

        let mIndex = 0;
        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 3; row++) {
                if(monsters[mIndex]) {
                    this.dungeon[col].push(monsters[mIndex]);
                    mIndex++;
                }
            }
        }

        this.powerDeck = powerCards;
        this.shuffleArray(this.powerDeck);

        this.gameState = 'DRAW';
        this.drawHand();
    }

    drawHand() {
        if (this.hand.length > 0) return;

        // Draw up to 3 cards
        for (let i = 0; i < 3; i++) {
            if (this.powerDeck.length > 0) {
                this.hand.push(this.powerDeck.shift());
            }
        }

        this.gameState = 'PLAY';
    }

    selectCard(index) {
        if (this.selectedCardIndex === index) {
            this.selectedCardIndex = null;
        } else {
            this.selectedCardIndex = index;
        }
    }

    assignCardToColumn(colIndex) {
        if (this.selectedCardIndex === null) return false;

        this.saveState();

        // Check valid column?
        if (colIndex < 0 || colIndex > 3) return false;

        const card = this.hand[this.selectedCardIndex];

        // Remove from hand
        this.hand.splice(this.selectedCardIndex, 1);
        this.selectedCardIndex = null;

        // Add to stage
        if (!this.stagedCards[colIndex]) this.stagedCards[colIndex] = [];
        this.stagedCards[colIndex].push(card);

        // Auto-Attack Check
        if (this.stagedCards[colIndex].length === 3) {
            this.attemptAttack(colIndex);
        }

        if (this.hand.length === 0) {
            this.drawHand();
        }

        return true;
    }

    discardSelectedCard() {
         if (this.selectedCardIndex === null) return false;

         this.saveState();

         const card = this.hand[this.selectedCardIndex];
         this.hand.splice(this.selectedCardIndex, 1);
         this.selectedCardIndex = null;

         this.discardPile.push(card);

         if (this.hand.length === 0) {
             this.drawHand();
         }

         return true;
    }

    attemptAttack(colIndex) {
        const cards = this.stagedCards[colIndex];
        if (cards.length !== 3) return false;

        // Attempt all permutations since order of placement matters in code but maybe not for user
        // Rules: 2 Power Cards (Sum >= Monster) + 1 Weakness Card (Suit Match)

        // Let's try to find a valid combination
        const monster = this.dungeon[colIndex][this.dungeon[colIndex].length - 1]; // Top card
        if (!monster) return false; // No monster?

        const monsterPower = this.getMonsterPower(monster);

        // Permutations of 3 cards is small (6). We can just check logic.
        // ACTUALLY: Rule is "The first two cards... The third card..."
        // If we strictly follow placement order:
        // const p1 = this.getCardValue(cards[0]);
        // const p2 = this.getCardValue(cards[1]);
        // const suitCard = cards[2];

        // But user might want flexibility. Let's start with strict First+Second = Power, Third = Suit
        // consistent with current auto-trigger when 3rd card is added.

        const p1 = this.getCardValue(cards[0]);
        const p2 = this.getCardValue(cards[1]);
        const suitCard = cards[2];

        const attackPower = p1 + p2;
        const suitMatch = (suitCard.suit === 'Joker') || (suitCard.suit === monster.suit);

        if (attackPower >= monsterPower && suitMatch) {
            this.executeAttack(colIndex, cards);
            return true;
        }

        // If failed, they stay staged/become damage later.
        return false;
    }

    executeAttack(colIndex, cards) {
        const monster = this.dungeon[colIndex].pop();
        if (monster) {
            this.clearPile.push(monster);
        }
        this.clearPile.push(...cards);
        this.stagedCards[colIndex] = []; // Clear stage
    }

    resolveTurn() {
        this.saveState();
        // Discard remaining hand
        this.discardPile.push(...this.hand);
        this.hand = [];
        this.selectedCardIndex = null;

        // Staged cards persist!

        this.gameState = 'DRAW';
    }

    checkWinLoss() {
        if (this.discardPile.length >= 7) return 'LOSS';

        const allMonstersDefeated = this.dungeon.every(col => col.length === 0);
        if (allMonstersDefeated) return 'WIN';

        if (this.powerDeck.length === 0 && this.hand.length === 0 && !allMonstersDefeated) {
             // If we can't draw and grid is not clear -> Loss?
             // Or maybe we can still play staged cards?
             // "If the Power Deck runs out... you lose."
             return 'LOSS';
        }

        return 'PLAYING';
    }

    getCardValue(card) {
        if (card.suit === 'Joker') return 10;
        if (card.nameRank === 'Ace') return 1;
        const rankMap = {
            'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5, 'Six': 6,
            'Seven': 7, 'Eight': 8, 'Nine': 9, 'Ten': 10
        };
        if (rankMap[card.nameRank]) return rankMap[card.nameRank];
        return 0;
    }

    getMonsterPower(card) {
        if (card.nameRank === 'Jack') return 11;
        if (card.nameRank === 'Queen') return 12;
        if (card.nameRank === 'King') return 13;
        return 0;
    }

    saveState() {
        const state = {
            dungeon: JSON.parse(JSON.stringify(this.dungeon)),
            powerDeck: JSON.parse(JSON.stringify(this.powerDeck)),
            hand: JSON.parse(JSON.stringify(this.hand)),
            stagedCards: JSON.parse(JSON.stringify(this.stagedCards)),
            discardPile: JSON.parse(JSON.stringify(this.discardPile)),
            clearPile: JSON.parse(JSON.stringify(this.clearPile)),
            gameState: this.gameState,
            selectedCardIndex: this.selectedCardIndex
        };
        this.history.push(state);
        // Limit history to 20 moves to keep it manageable
        if (this.history.length > 20) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length === 0) return false;

        const state = this.history.pop();
        this.dungeon = state.dungeon;
        this.powerDeck = state.powerDeck;
        this.hand = state.hand;
        this.stagedCards = state.stagedCards;
        this.discardPile = state.discardPile;
        this.clearPile = state.clearPile;
        this.gameState = state.gameState;
        this.selectedCardIndex = null;

        return true;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
