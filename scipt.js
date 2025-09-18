// Global state
let currentTheme = '';
let currentDay = 0;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let startTime;
let stopwatchInterval;
let userSelections = [];

// Theme configuration with display names
const themes = {
    'vocabulary': { displayName: 'Vocabulary' },
    'tables': { displayName: 'Table' },
    'indianRulers': { displayName: 'Indian Rulers Timeline' },
    'atomicNumbers': { displayName: 'Atomic Numbers' },
    'trignometricEquations': { displayName: 'Trigonometric Equations' }
    // Add more themes as needed
};

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname.split('/').pop();
    
    if (path === 'index.html' || path === '') {
        setupThemeSelection();
    } else if (path === 'days.html') {
        setupDaySelection();
    } else if (path === 'quiz.html') {
        initializeQuiz();
    }
});

// Theme Selection Page
function setupThemeSelection() {
    const container = document.getElementById('theme-buttons');
    container.innerHTML = '';
    
    Object.entries(themes).forEach(([themeId, themeData]) => {
        const button = document.createElement('button');
        button.className = 'glow';
        button.textContent = themeData.displayName;
        button.onclick = () => {
            currentTheme = themeId;
            localStorage.setItem('selectedTheme', themeId);
            window.location.href = 'days.html';
        };
        container.appendChild(button);
    });
}

// Day Selection Page
function setupDaySelection() {
    currentTheme = localStorage.getItem('selectedTheme');
    if (!currentTheme || !themes[currentTheme]) {
        window.location.href = 'index.html';
        return;
    }

    fetch(`themes/${currentTheme}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No questions found in file');
            }
            
            questions = data;
            const totalDays = Math.ceil(questions.length / 5);
            const container = document.getElementById('day-buttons');
            container.innerHTML = '';
            
            for (let day = 1; day <= totalDays; day++) {
                const button = document.createElement('button');
                button.className = 'glow';
                button.textContent = `Day ${day}`;
                button.onclick = () => {
                    currentDay = day;
                    localStorage.setItem('selectedDay', day);
                    window.location.href = 'quiz.html';
                };
                container.appendChild(button);
            }
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            alert('Failed to load questions. Please try again.');
            window.location.href = 'index.html';
        });
}

// Quiz Page
function initializeQuiz() {
    currentTheme = localStorage.getItem('selectedTheme');
    currentDay = parseInt(localStorage.getItem('selectedDay'));
    
    if (!currentTheme || !currentDay) {
        window.location.href = 'index.html';
        return;
    }

    // Show loading state
    document.getElementById('question-text').textContent = "Loading questions...";
    
    fetch(`themes/${currentTheme}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No questions found in file');
            }
            
            // First select the first (day * 5) questions, then shuffle them
            const totalQuestionsToSelect = currentDay * 5;
            const selectedQuestions = data.slice(0, totalQuestionsToSelect);
            questions = shuffleArray(selectedQuestions);
            
            currentQuestionIndex = 0;
            score = 0;
            userSelections = [];
            startStopwatch();
            displayQuestion();
            
            // Set up event listeners
            document.getElementById('submit-button').addEventListener('click', checkAnswer);
            document.getElementById('next-button').addEventListener('click', nextQuestion);
        })
        .catch(error => {
            console.error('Failed to load questions:', error);
            document.getElementById('question-text').textContent = 
                "Error: Could not load questions. Please check:";
            document.getElementById('options-container').innerHTML = `
                <p>1. JSON file exists in themes/ folder</p>
                <p>2. File contains valid questions</p>
                <button onclick="window.location.href='days.html'" class="glow">← Back to Day Selection</button>
            `;
        });
}

function displayQuestion() {
    const questionContainer = document.getElementById('quiz-container');
    const resultContainer = document.getElementById('result-container');
    const progressBar = document.getElementById('progress-counter');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const explanationContainer = document.getElementById('explanation-container');
    const submitButton = document.getElementById('submit-button');
    const nextButton = document.getElementById('next-button');

    // Verify all elements exist
    if (!questionContainer || !resultContainer || !progressBar || 
        !questionText || !optionsContainer || !explanationContainer) {
        console.error('Critical elements missing in HTML');
        return;
    }

    // Hide result container and show question container
    resultContainer.style.display = 'none';
    questionContainer.style.display = 'block';

    if (currentQuestionIndex >= questions.length) {
        showResults();
        return;
    }

    const question = questions[currentQuestionIndex];
    
    // Update progress counter
    progressBar.textContent = `${currentQuestionIndex + 1}/${questions.length}`;
    
    // Set question text
    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    explanationContainer.style.display = 'none';
    submitButton.style.display = 'block';
    nextButton.style.display = 'none';
    
    // Reset user selections
    userSelections = [];

    // Create option checkboxes
    const shuffledOptions = shuffleArray([...question.choices]);
    shuffledOptions.forEach(option => {
        const checkboxId = `option-${Math.random().toString(36).substr(2, 9)}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'option-checkbox';
        checkbox.id = checkboxId;
        checkbox.value = option;
        
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                userSelections.push(this.value);
            } else {
                userSelections = userSelections.filter(item => item !== this.value);
            }
        });
        
        const label = document.createElement('label');
        label.className = 'option-label';
        label.htmlFor = checkboxId;
        label.textContent = option;
        
        optionsContainer.appendChild(checkbox);
        optionsContainer.appendChild(label);
    });
}

function checkAnswer() {
    if (userSelections.length === 0) {
        alert('Please select at least one answer');
        return;
    }
    
    const question = questions[currentQuestionIndex];
    const options = document.querySelectorAll('#options-container label');
    const checkboxes = document.querySelectorAll('#options-container input');
    const correctAnswers = question.answers;
    
    // Disable all checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.disabled = true;
    });
    
    // Hide submit button, show next button
    document.getElementById('submit-button').style.display = 'none';
    document.getElementById('next-button').style.display = 'block';
    
    // Check each option
    let correctCount = 0;
    let incorrectCount = 0;
    
    options.forEach(option => {
        const checkbox = document.getElementById(option.htmlFor);
        const optionValue = checkbox.value;
        
        if (correctAnswers.includes(optionValue)) {
            if (userSelections.includes(optionValue)) {
                option.classList.add('correct-answer');
                correctCount++;
            } else {
                option.classList.add('partial-answer');
            }
        } else if (userSelections.includes(optionValue)) {
            option.classList.add('wrong-answer');
            incorrectCount++;
        }
    });
    
    // Calculate points (partial credit for partially correct answers)
    if (incorrectCount === 0 && correctCount === correctAnswers.length) {
        score += 1; // Full points
    } else if (correctCount > 0 && incorrectCount === 0) {
        score += 0.5; // Half points
    } else if (correctCount > 0) {
        score += 0.25; // Quarter points for some correct but with incorrect selections
    }
    
    // Show explanation
    document.getElementById('explanation-text').textContent = question.explanation;
    document.getElementById('explanation-container').style.display = 'block';
}

function nextQuestion() {
    currentQuestionIndex++;
    displayQuestion();
}

function showResults() {
    stopStopwatch();
    const totalQuestions = questions.length;
    const accuracy = Math.round((score / totalQuestions) * 100);
    
    document.getElementById('score').textContent = score.toFixed(2);
    document.getElementById('total').textContent = totalQuestions;
    document.getElementById('completion-time').textContent = 
        document.getElementById('stopwatch').textContent;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
    
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('result-container').style.display = 'block';
}

// Stopwatch functions
function startStopwatch() {
    startTime = Date.now();
    stopwatchInterval = setInterval(updateStopwatch, 1000);
}

function updateStopwatch() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('stopwatch').textContent = `${minutes}:${seconds}`;
}

function stopStopwatch() {
    clearInterval(stopwatchInterval);
}

// Utility function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
