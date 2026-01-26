import './style.css';
import { Game } from './game.js';

// DOM Elements
const app = document.getElementById('app');
const dungeonCols = [
  document.getElementById('col-0'),
  document.getElementById('col-1'),
  document.getElementById('col-2'),
  document.getElementById('col-3'),
];
const handContainer = document.getElementById('hand-container');
const powerDeckEl = document.getElementById('power-deck');
const scoreEl = document.getElementById('score');
const damageCountEl = document.getElementById('damage-count');
const attackBtn = document.getElementById('attack-btn');
const modal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const restartBtn = document.getElementById('restart-btn');
const discardPileEl = document.getElementById('discard-pile');
const undoBtn = document.getElementById('undo-btn');
const instructionsBtn = document.getElementById('instructions-btn');
const instructionsDialog = document.getElementById('instructions-dialog');
const closeInstructionsBtn = document.getElementById('close-instructions-btn');

// Game State
let game;

// Initialization
function init() {
  game = new Game();
  game.setup();
  render();
}

const powerDeckContainer = document.getElementById('power-deck-container');

// Drawing is now automatic when the hand is empty.

// Column Selection - Assign Card
dungeonCols.forEach((colEl, index) => {
    colEl.addEventListener('click', () => {
        if (game.gameState === 'PLAY') {
            const success = game.assignCardToColumn(index);
            if (success) render();
        }
    });
});

// Discard Pile - Discard Selected
discardPileEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (game.gameState === 'PLAY') {
        const success = game.discardSelectedCard();
        if (success) render();
    }
});

undoBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const success = game.undo();
    if (success) render();
});



restartBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    init();
});

instructionsBtn?.addEventListener('click', () => {
    if (instructionsDialog instanceof HTMLDialogElement) {
        instructionsDialog.showModal();
    }
});

closeInstructionsBtn?.addEventListener('click', () => {
    if (instructionsDialog instanceof HTMLDialogElement) {
        instructionsDialog.close();
    }
});

// Close dialog when clicking outside
instructionsDialog?.addEventListener('click', (e) => {
    if (!(instructionsDialog instanceof HTMLDialogElement)) return;
    const dialogDimensions = instructionsDialog.getBoundingClientRect();
    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      instructionsDialog.close();
    }
});

// Rendering Logic
function render() {
    // 1. Update Status
    scoreEl.textContent = game.powerDeck.length;
    damageCountEl.textContent = game.discardPile.length;

    // 2. Render Dungeon
    dungeonCols.forEach((colEl, index) => {
        colEl.innerHTML = '';
        const monsterStack = game.dungeon[index];
        // Render Monsters
        monsterStack.forEach((card, stackIndex) => {
            const cardEl = createCardElement(card);
            // Face Down Logic: Only top is visible
            const isTop = stackIndex === monsterStack.length - 1;

            if (!isTop) {
                // Apply card-back and hide content
                cardEl.className = 'card card-back covered-monster';
                cardEl.textContent = '';
            } else {
                cardEl.classList.add('top-monster');
            }
            colEl.appendChild(cardEl);
        });

        // Render Staged Cards
        const staged = game?.stagedCards?.[index] || [];
        if (staged.length > 0) {
            const stagedContainer = document.createElement('div');
            stagedContainer.classList.add('staged-container');
            staged.forEach(sc => {
                const scEl = createCardElement(sc);
                scEl.classList.add('staged-card');
                stagedContainer.appendChild(scEl);
            });
            colEl.appendChild(stagedContainer);
        }
    });

    // 3. Render Hand
    handContainer.innerHTML = '';
    game.hand.forEach((card, index) => {
        const cardEl = createCardElement(card);
        if (!cardEl) {
             return;
        }
        cardEl.dataset.index = index;
        cardEl.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent bubbling
            game.selectCard(index);
            render();
        });

        if (game.selectedCardIndex === index) {
            cardEl.classList.add('selected');
        }
        handContainer.appendChild(cardEl);
    });



    // Attack button hidden
    if(attackBtn) attackBtn.style.display = 'none';

    // 4. Update Undo Button
    undoBtn.disabled = game.history.length === 0;

    // 5. Check Game Over
    const status = game.checkWinLoss();
    if (status !== 'PLAYING') {
        showGameOver(status);
    }
}

function createCardElement(card) {
    if (!card) return null;
    const el = document.createElement('div');
    el.classList.add('card');

    // Safety check for suit
    if (!card.suit) {
        console.error('Card missing suit:', card);
        el.textContent = 'ERR';
        return el;
    }

    if (card.suit === 'Joker') {
        el.classList.add('black');
        el.textContent = 'Joker';
        return el;
    }

    if (['Hearts', 'Diamonds'].includes(card.suit)) {
        el.classList.add('red');
    } else {
        el.classList.add('black');
    }

    const suitIcons = { 'Spades': '♠', 'Hearts': '♥', 'Diamonds': '♦', 'Clubs': '♣' };
    el.textContent = `${card.initial} ${suitIcons[card.suit] || ''}`;

    if (['Jack', 'Queen', 'King'].includes(card.nameRank)) {
        el.classList.add('monster');
    }
    return el;
}

function showGameOver(status) {
    modal.classList.remove('hidden');
    if (status === 'WIN') {
        modalTitle.textContent = 'Victory!';
        modalMessage.textContent = 'You have cleared the dungeon!';
    } else {
        modalTitle.textContent = 'Defeat!';
        modalMessage.textContent = 'The dungeon has claimed you.';
    }
}

// Start
init();
