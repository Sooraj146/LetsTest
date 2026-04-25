const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
const Question = require('../models/Question');

dotenv.config();

// Fix Windows DNS SRV resolution issue — forces Google public DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);



const questions = [
  // Age Calculation
  {
    section: 'Age Calculation',
    questionText: 'The sum of ages of 5 children born at the intervals of 3 years each is 50 years. What is the age of the youngest child?',
    options: ['4 years', '8 years', '10 years', 'None of these'],
    correctAnswer: '4 years'
  },
  {
    section: 'Age Calculation',
    questionText: 'A father said to his son, "I was as old as you are at the present at the time of your birth". If the father\'s age is 38 years now, the son\'s age five years back was:',
    options: ['14 years', '19 years', '33 years', '38 years'],
    correctAnswer: '14 years'
  },
  {
    section: 'Age Calculation',
    questionText: 'A is two years older than B who is twice as old as C. If the total of the ages of A, B and C be 27, then how old is B?',
    options: ['7', '8', '9', '10'],
    correctAnswer: '10'
  },
  {
    section: 'Age Calculation',
    questionText: 'Present ages of Sameer and Anand are in the ratio of 5 : 4 respectively. Three years hence, the ratio of their ages will become 11 : 9 respectively. What is Anand\'s present age in years?',
    options: ['24', '27', '40', 'Cannot be determined'],
    correctAnswer: '24'
  },
  {
    section: 'Age Calculation',
    questionText: 'Six years ago, the ratio of the ages of Kunal and Sagar was 6 : 5. Four years hence, the ratio of their ages will be 11 : 10. What is Sagar\'s age at present?',
    options: ['16 years', '18 years', '20 years', 'Cannot be determined'],
    correctAnswer: '16 years'
  },
  {
    section: 'Age Calculation',
    questionText: 'The sum of the present ages of a father and his son is 60 years. Six years ago, father\'s age was five times the age of the son. After 6 years, son\'s age will be:',
    options: ['12 years', '14 years', '18 years', '20 years'],
    correctAnswer: '20 years'
  },

  // Profit & Loss
  {
    section: 'Profit & Loss',
    questionText: 'A person incurs a loss of 5% be selling a watch for Rs. 1140. At what price should the watch be sold to earn 5% profit?',
    options: ['Rs. 1200', 'Rs. 1230', 'Rs. 1260', 'Rs. 1290'],
    correctAnswer: 'Rs. 1260'
  },
  {
    section: 'Profit & Loss',
    questionText: 'A shopkeeper sells some toys at Rs. 250 each. What percent profit does he make? To find the answer, which of the following information given in Statements I and II is/are necessary?\nI. Number of toys sold.\nII. Cost price of each toy.',
    options: ['Only I is necessary', 'Only II is necessary', 'Both I and II are necessary', 'Either I or II is necessary'],
    correctAnswer: 'Only II is necessary'
  },
  {
    section: 'Profit & Loss',
    questionText: 'A man buys a cycle for Rs. 1400 and sells it at a loss of 15%. What is the selling price of the cycle?',
    options: ['Rs. 1090', 'Rs. 1160', 'Rs. 1190', 'Rs. 1202'],
    correctAnswer: 'Rs. 1190'
  },
  {
    section: 'Profit & Loss',
    questionText: 'Sam purchased 20 dozens of toys at the rate of Rs. 375 per dozen. He sold each one of them at the rate of Rs. 33. What was his percentage profit?',
    options: ['3.5', '4.5', '5.6', '6.5'],
    correctAnswer: '5.6'
  },
  {
    section: 'Profit & Loss',
    questionText: 'Some articles were bought at 6 articles for Rs. 5 and sold at 5 articles for Rs. 6. Gain percent is:',
    options: ['30%', '33 1/3%', '35%', '44%'],
    correctAnswer: '44%'
  },
  {
    section: 'Profit & Loss',
    questionText: 'On selling 17 balls at Rs. 720, there is a loss equal to the cost price of 5 balls. The cost price of a ball is:',
    options: ['Rs. 45', 'Rs. 50', 'Rs. 55', 'Rs. 60'],
    correctAnswer: 'Rs. 60'
  },

  // Analogy
  {
    section: 'Analogy',
    questionText: 'Odometer is to mileage as compass is to',
    options: ['speed', 'hiking', 'needle', 'direction'],
    correctAnswer: 'direction'
  },
  {
    section: 'Analogy',
    questionText: 'Marathon is to race as hibernation is to',
    options: ['winter', 'bear', 'dream', 'sleep'],
    correctAnswer: 'sleep'
  },
  {
    section: 'Analogy',
    questionText: 'Window is to pane as book is to',
    options: ['novel', 'glass', 'cover', 'page'],
    correctAnswer: 'page'
  },
  {
    section: 'Analogy',
    questionText: 'Cup is to coffee as bowl is to',
    options: ['dish', 'soup', 'spoon', 'food'],
    correctAnswer: 'soup'
  },
  {
    section: 'Analogy',
    questionText: 'Yard is to inch as quart is to',
    options: ['gallon', 'ounce', 'milk', 'liquid'],
    correctAnswer: 'ounce'
  },
  {
    section: 'Analogy',
    questionText: 'Elated is to despondent as enlightened is to',
    options: ['aware', 'ignorant', 'miserable', 'tolerant'],
    correctAnswer: 'ignorant'
  },

  // Time & Work
  {
    section: 'Time & Work',
    questionText: 'A can do a work in 15 days and B in 20 days. If they work on it together for 4 days, then the fraction of the work that is left is:',
    options: ['1/4', '1/10', '7/15', '8/15'],
    correctAnswer: '8/15'
  },
  {
    section: 'Time & Work',
    questionText: 'A can lay railway track between two given stations in 16 days and B can do the same job in 12 days. With help of C, they did the job in 4 days only. Then, C alone can do the job in:',
    options: ['9 1/5 days', '9 2/5 days', '9 3/5 days', '10 days'],
    correctAnswer: '9 3/5 days'
  },
  {
    section: 'Time & Work',
    questionText: 'A, B and C can do a piece of work in 20, 30 and 60 days respectively. In how many days can A do the work if he is assisted by B and C on every third day?',
    options: ['12 days', '15 days', '16 days', '18 days'],
    correctAnswer: '15 days'
  },
  {
    section: 'Time & Work',
    questionText: 'A is thrice as good as workman as B and therefore is able to finish a job in 60 days less than B. Working together, they can do it in:',
    options: ['20 days', '22 1/2 days', '25 days', '30 days'],
    correctAnswer: '22 1/2 days'
  },
  {
    section: 'Time & Work',
    questionText: 'A alone can do a piece of work in 6 days and B alone in 8 days. A and B undertook to do it for Rs. 3200. With the help of C, they completed the work in 3 days. How much is to be paid to C?',
    options: ['Rs. 375', 'Rs. 400', 'Rs. 600', 'Rs. 800'],
    correctAnswer: 'Rs. 400'
  },
  {
    section: 'Time & Work',
    questionText: 'If 6 men and 8 boys can do a piece of work in 10 days while 26 men and 48 boys can do the same in 2 days, the time taken by 15 men and 20 boys in doing the same type of work will be:',
    options: ['4 days', '5 days', '6 days', '7 days'],
    correctAnswer: '4 days'
  },

  // Number Series
  {
    section: 'Number Series',
    questionText: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
    options: ['(1/3)', '(1/8)', '(2/8)', '(1/16)'],
    correctAnswer: '(1/8)'
  },
  {
    section: 'Number Series',
    questionText: 'Look at this series: 7, 10, 8, 11, 9, 12, ... What number should come next?',
    options: ['7', '10', '12', '13'],
    correctAnswer: '10'
  },
  {
    section: 'Number Series',
    questionText: 'Look at this series: 36, 34, 30, 28, 24, ... What number should come next?',
    options: ['20', '22', '23', '26'],
    correctAnswer: '22'
  },
  {
    section: 'Number Series',
    questionText: 'Look at this series: 22, 21, 23, 22, 24, 23, ... What number should come next?',
    options: ['22', '24', '25', '26'],
    correctAnswer: '25'
  },
  {
    section: 'Number Series',
    questionText: 'Look at this series: 53, 53, 40, 40, 27, 27, ... What number should come next?',
    options: ['12', '14', '27', '53'],
    correctAnswer: '14'
  },
  {
    section: 'Number Series',
    questionText: 'Look at this series: 21, 9, 21, 11, 21, 13, 21, ... What number should come next?',
    options: ['14', '15', '21', '23'],
    correctAnswer: '15'
  }
];

const importData = async () => {
  try {
    await Question.deleteMany();
    await Question.insertMany(questions);
    console.log('Data Imported! 30 questions loaded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

// Directly connect and wait for the 'open' event before seeding
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected! Starting seed...');
    return importData();
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });

