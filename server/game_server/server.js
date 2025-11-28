const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MAX_PLAYERS = 2;
const DELAY_BEFORE_QUIZ = 2000;

const clients = {};
const games = {};

// --- MASTER QUESTION DATABASE (FULLY POPULATED) ---
const allQuestions = {
    // --- JUNGLE PROFESSOR QUESTIONS ---
    'j_lion1': { id: "j_lion1", question: "LION: What is a group of lions called?", answer: "pride" },
    'j_lion2': { id: "j_lion2", question: "LION: On which continent do most wild lions live?", answer: "africa" },
    'j_lion3': { id: "j_lion3", question: "LION: True or False: The male lion does most of the hunting for the group.", answer: "false" },
    'j_rhino1': { id: "j_rhino1", question: "RHINO: What is a rhino's horn made of?", answer: "keratin" },
    'j_rhino2': { id: "j_rhino2", question: "RHINO: What is a group of rhinos called?", answer: "crash" },
    'j_rhino3': { id: "j_rhino3", question: "RHINO: Are rhinos herbivores (plant-eaters) or carnivores (meat-eaters)?", answer: "herbivores" },
    'j_cheetah1': { id: "j_cheetah1", question: "CHEETAH: True or False: This is the fastest land animal.", answer: "true" },
    'j_cheetah2': { id: "j_cheetah2", question: "CHEETAH: Can a cheetah roar like a lion?", answer: "no" },
    'j_cheetah3': { id: "j_cheetah3", question: "CHEETAH: Do cheetahs hunt primarily during the day or at night?", answer: "day" },
    'j_elephant1': { id: "j_elephant1", question: "ELEPHANT: What is a baby elephant called?", answer: "calf" },
    'j_elephant2': { id: "j_elephant2", question: "ELEPHANT: Which type of elephant is generally larger, African or Asian?", answer: "african" },
    'j_elephant3': { id: "j_elephant3", question: "ELEPHANT: An elephant's tusks are actually oversized what?", answer: "teeth" },
    'j_tiger1': { id: "j_tiger1", question: "TIGER: Which is the largest tiger subspecies?", answer: "siberian" },
    'j_tiger2': { id: "j_tiger2", question: "TIGER: Unlike most cats, tigers are known to enjoy what activity?", answer: "swimming" },
    'j_tiger3': { id: "j_tiger3", question: "TIGER: What is the pattern of a tiger's coat called?", answer: "stripes" },
    'j_leopard1': { id: "j_leopard1", question: "LEOPARD: Are a leopard's spots hollow rings (rosettes) or solid dots?", answer: "rosettes" },
    'j_leopard2': { id: "j_leopard2", question: "LEOPARD: Are leopards known for their ability to climb trees?", answer: "yes" },
    'j_leopard3': { id: "j_leopard3", question: "LEOPARD: What is a dark-colored leopard commonly called?", answer: "panther" },
    'j_jaguar1': { id: "j_jaguar1", question: "JAGUAR: On which two continents are jaguars naturally found?", answer: "america" },
    'j_jaguar2': { id: "j_jaguar2", question: "JAGUAR: Do jaguars have spots inside their rosettes?", answer: "yes" },
    'j_jaguar3': { id: "j_jaguar3", question: "JAGUAR: This big cat has one of the most powerful what in the animal kingdom?", answer: "bites" },
    'j_buffalo1': { id: "j_buffalo1", question: "CAPE BUFFALO: On which continent are they primarily found?", answer: "africa" },
    'j_buffalo2': { id: "j_buffalo2", question: "CAPE BUFFALO: The shape of their horns has earned them the nickname 'black death'. True or False?", answer: "true" },
    'j_buffalo3': { id: "j_buffalo3", question: "CAPE BUFFALO: What is a large group of these animals called?", answer: "herd" },
    'j_oryx1': { id: "j_oryx1", question: "ORYX: This antelope is adapted to live in what kind of hot, dry environment?", answer: "desert" },
    'j_oryx2': { id: "j_oryx2", question: "ORYX: Can both male and female oryx have long, straight horns?", answer: "yes" },
    'j_oryx3': { id: "j_oryx3", question: "ORYX: How do they survive in the desert with very little water?", answer: "eating plants" },
    'j_deer1': { id: "j_deer1", question: "DEER: What are the bony growths on a male deer's head called?", answer: "antlers" },
    'j_deer2': { id: "j_deer2", question: "DEER: Do deer shed their antlers every year?", answer: "yes" },
    'j_deer3': { id: "j_deer3", question: "DEER: What is a young deer called?", answer: "fawn" },
    'j_snake1': { id: "j_snake1", question: "GREEN TREE PYTHON: Are these snakes venomous?", answer: "no" },
    'j_snake2': { id: "j_snake2", question: "GREEN TREE PYTHON: How do pythons kill their prey?", answer: "constriction" },
    'j_snake3': { id: "j_snake3", question: "GREEN TREE PYTHON: On what large island are these snakes commonly found?", answer: "new guinea" },
    'j_turtle1': { id: "j_turtle1", question: "TORTOISE: Do tortoises typically live on land or in water?", answer: "land" },
    'j_turtle2': { id: "j_turtle2", question: "TORTOISE: What is the upper part of its shell called?", answer: "carapace" },
    'j_turtle3': { id: "j_turtle3", question: "TORTOISE: Some species of tortoise are known for having a very long what?", answer: "lifespan" },
    'j_ostrich1': { id: "j_ostrich1", question: "OSTRICH: It is the world's largest what?", answer: "bird" },
    'j_ostrich2': { id: "j_ostrich2", question: "OSTRICH: Can an ostrich fly?", answer: "no" },
    'j_ostrich3': { id: "j_ostrich3", question: "OSTRICH: Which is faster, an ostrich's run or a horse's gallop?", answer: "ostrich" },
    'j_gorilla1': { id: "j_gorilla1", question: "GORILLA: What is a group of gorillas called?", answer: "troop" },
    'j_gorilla2': { id: "j_gorilla2", question: "GORILLA: What is the dominant, silver-backed male leader of a group called?", answer: "silverback" },
    'j_gorilla3': { id: "j_gorilla3", question: "GORILLA: Are gorillas primarily herbivores or carnivores?", answer: "herbivores" },
    'j_eagle1': { id: "j_eagle1", question: "BALD EAGLE: It is the national bird of which country?", answer: "usa" },
    'j_eagle2': { id: "j_eagle2", question: "BALD EAGLE: Is this eagle actually bald?", answer: "no" },
    'j_eagle3': { id: "j_eagle3", question: "BALD EAGLE: What is their primary food source?", answer: "fish" },
    'j_chimp1': { id: "j_chimp1", question: "CHIMPANZEE: Are they considered one of the 'great apes'?", answer: "yes" },
    'j_chimp2': { id: "j_chimp2", question: "CHIMPANZEE: Are chimpanzees known for their ability to use tools?", answer: "yes" },
    'j_chimp3': { id: "j_chimp3", question: "CHIMPANZEE: Do chimpanzees live in social groups?", answer: "yes" },
    'j_lemur1': { id: "j_lemur1", question: "LEMUR: To which island country are they native?", answer: "madagascar" },
    'j_lemur2': { id: "j_lemur2", question: "LEMUR: What is the most recognizable feature of the Ring-tailed Lemur?", answer: "tail" },
    'j_lemur3': { id: "j_lemur3", question: "LEMUR: Is a lemur a type of monkey?", answer: "no" },
    'j_giraffe1': { id: "j_giraffe1", question: "GIRAFFE: What is the name for the horn-like bumps on its head?", answer: "ossicones" },
    'j_giraffe2': { id: "j_giraffe2", question: "GIRAFFE: This animal is the world's tallest what?", answer: "mammal" },
    'j_giraffe3': { id: "j_giraffe3", question: "GIRAFFE: A giraffe has the same number of neck bones as a what?", answer: "human" },
    'j_heron1': { id: "j_heron1", question: "HERON: Do these birds typically hunt in groups or alone?", answer: "alone" },
    'j_heron2': { id: "j_heron2", question: "HERON: What type of environment are herons usually found near?", answer: "water" },
    'j_heron3': { id: "j_heron3", question: "HERON: What is the primary food for most herons?", answer: "fish" },
    'j_toucan1': { id: "j_toucan1", question: "TOUCAN: Is its large, colorful bill heavy or lightweight?", answer: "lightweight" },
    'j_toucan2': { id: "j_toucan2", question: "TOUCAN: On which continent would you primarily find toucans?", answer: "america" },
    'j_toucan3': { id: "j_toucan3", question: "TOUCAN: What do toucans mainly eat?", answer: "fruit" },
    'j_macaw1': { id: "j_macaw1", question: "MACAW: Are these parrots known for their intelligence?", answer: "yes" },
    'j_macaw2': { id: "j_macaw2", question: "MACAW: Macaws are native to the rainforests of which continent?", answer: "america" },
    'j_macaw3': { id: "j_macaw3", question: "MACAW: True or False: Some species of macaw can live for over 80 years.", answer: "true" },
    'j_hippo1': { id: "j_hippo1", question: "HIPPOPOTAMUS: Do they spend most of their day in water or on land?", answer: "water" },
    'j_hippo2': { id: "j_hippo2", question: "HIPPOPOTAMUS: Is a hippo more closely related to a pig or a whale?", answer: "whale" },
    'j_hippo3': { id: "j_hippo3", question: "HIPPOPOTAMUS: What is the liquid they secrete, which acts as a natural sunblock?", answer: "blood sweat" },
    'j_warthog1': { id: "j_warthog1", question: "WARTHOG: What is its main defense mechanism?", answer: "tusks" },
    'j_warthog2': { id: "j_warthog2", question: "WARTHOG: Warthogs are a member of which animal family?", answer: "pig" },
    'j_warthog3': { id: "j_warthog3", question: "WARTHOG: Do they use their tusks for digging or for fighting?", answer: "both" },
    'j_hyena1': { id: "j_hyena1", question: "HYENA: Is a hyena more closely related to a cat or a dog?", answer: "cat" },
    'j_hyena2': { id: "j_hyena2", question: "HYENA: What is the sound a hyena is famous for making?", answer: "laugh" },
    'j_hyena3': { id: "j_hyena3", question: "HYENA: Does the Spotted Hyena have one of the strongest bites in the animal kingdom?", answer: "yes" },
    'j_crocodile1': { id: "j_crocodile1", question: "CROCODILE: Do they have a V-shaped or U-shaped snout?", answer: "v-shaped" },
    'j_crocodile2': { id: "j_crocodile2", question: "CROCODILE: Can crocodiles breathe underwater?", answer: "no" },
    'j_crocodile3': { id: "j_crocodile3", question: "CROCODILE: The American Alligator has a U-shaped snout. True or False?", answer: "true" },
    'j_komodo1': { id: "j_komodo1", question: "KOMODO DRAGON: It is the world's largest what?", answer: "lizard" },
    'j_komodo2': { id: "j_komodo2", question: "KOMODO DRAGON: They are native to which country?", answer: "indonesia" },
    'j_komodo3': { id: "j_komodo3", question: "KOMODO DRAGON: Do they have a venomous bite?", answer: "yes" },
    'j_camel1': { id: "j_camel1", question: "CAMEL: What is stored in a camel's hump(s)?", answer: "fat" },
    'j_camel2': { id: "j_camel2", question: "CAMEL: A camel with one hump is called a what?", answer: "dromedary" },
    'j_camel3': { id: "j_camel3", question: "CAMEL: Do camels have one, two, or three sets of eyelids?", answer: "three" },
    'j_impala1': { id: "j_impala1", question: "IMPALA: Are they known for their impressive jumping ability?", answer: "yes" },
    'j_impala2': { id: "j_impala2", question: "IMPALA: What is the term for their leaping and jumping behavior to evade predators?", answer: "stotting" },
    'j_impala3': { id: "j_impala3", question: "IMPALA: Do female impalas have horns?", answer: "no" },
    'j_python1': { id: "j_python1", question: "PYTHON: How do pythons kill their prey?", answer: "constriction" },
    'j_python2': { id: "j_python2", question: "PYTHON: Are pythons found in the Americas?", answer: "no" },
    'j_python3': { id: "j_python3", question: "PYTHON: Which is the longest species of python?", answer: "reticulated" },
    'j_peacock1': { id: "j_peacock1", question: "PEACOCK: Are the colorful tail feathers found on the male (peacock) or female (peahen)?", answer: "male" },
    'j_peacock2': { id: "j_peacock2", question: "PEACOCK: What is the technical term for the peacock's impressive tail display?", answer: "train" },
    'j_peacock3': { id: "j_peacock3", question: "PEACOCK: This bird is the national bird of which country?", answer: "india" },

    // --- CITY TOUR QUESTIONS ---
    'c_moscow1': { id: "c_moscow1", question: "ST. BASIL'S: This cathedral is located in which famous square?", answer: "red square" },
    'c_moscow2': { id: "c_moscow2", question: "ST. BASIL'S: It is a famous landmark of which Russian city?", answer: "moscow" },
    'c_moscow3': { id: "c_moscow3", question: "ST. BASIL'S: Were its architects rumored to have been blinded so they could not create anything as beautiful?", answer: "yes" },
    'c_giza1': { id: "c_giza1", question: "PYRAMIDS: The Great Pyramid of Giza was built as a tomb for which pharaoh?", answer: "khufu" },
    'c_giza2': { id: "c_giza2", question: "PYRAMIDS: The Great Sphinx has the head of a human and the body of what animal?", answer: "lion" },
    'c_giza3': { id: "c_giza3", question: "PYRAMIDS: In which country are these ancient structures located?", answer: "egypt" },
    'c_sydney1': { id: "c_sydney1", question: "SYDNEY OPERA HOUSE: In which country is this performing arts centre located?", answer: "australia" },
    'c_sydney2': { id: "c_sydney2", question: "SYDNEY OPERA HOUSE: The building's roof is made of shell-like structures. True or False?", answer: "true" },
    'c_sydney3': { id: "c_sydney3", question: "SYDNEY OPERA HOUSE: Which major international sporting event was held in Sydney in 2000?", answer: "olympics" },
    'c_rome1': { id: "c_rome1", question: "COLOSSEUM: In which Italian city would you find this ancient amphitheater?", answer: "rome" },
    'c_rome2': { id: "c_rome2", question: "COLOSSEUM: What type of combatants famously fought here?", answer: "gladiators" },
    'c_rome3': { id: "c_rome3", question: "COLOSSEUM: Was it used for mock sea battles?", answer: "yes" },
    'c_petra1': { id: "c_petra1", question: "PETRA: In which country is this ancient city carved from rock?", answer: "jordan" },
    'c_petra2': { id: "c_petra2", question: "PETRA: What is the most famous building in Petra, often seen in movies?", answer: "treasury" },
    'c_petra3': { id: "c_petra3", question: "PETRA: What color is the sandstone rock that Petra is carved into?", answer: "rose" },
    'c_hollywood1': { id: "c_hollywood1", question: "HOLLYWOOD SIGN: In which US state is this famous landmark located?", answer: "california" },
    'c_hollywood2': { id: "c_hollywood2", question: "HOLLYWOOD SIGN: The sign is located in which major US city?", answer: "los angeles" },
    'c_hollywood3': { id: "c_hollywood3", question: "HOLLYWOOD SIGN: Originally, did the sign say 'Hollywood' or 'Hollywoodland'?", answer: "hollywoodland" },
    'c_pisa1': { id: "c_pisa1", question: "LEANING TOWER: In which country is this famous tower located?", answer: "italy" },
    'c_pisa2': { id: "c_pisa2", question: "LEANING TOWER: The tower is the freestanding bell tower, or 'campanile', of which city's cathedral?", answer: "pisa" },
    'c_pisa3': { id: "c_pisa3", question: "LEANING TOWER: Did the lean begin during its construction?", answer: "yes" },
    'c_paris1': { id: "c_paris1", question: "EIFFEL TOWER: In which country is it the most-visited paid monument?", answer: "france" },
    'c_paris2': { id: "c_paris2", question: "EIFFEL TOWER: What is the nickname of Paris, the city where it stands?", answer: "city of light" },
    'c_paris3': { id: "c_paris3", question: "EIFFEL TOWER: Was it originally intended to be a temporary structure?", answer: "yes" },
    'c_washington1': { id: "c_washington1", question: "WHITE HOUSE: It is the official residence of the president of which country?", answer: "usa" },
    'c_washington2': { id: "c_washington2", question: "WHITE HOUSE: In which city is it located?", answer: "washington dc" },
    'c_washington3': { id: "c_washington3", question: "WHITE HOUSE: The famous Oval Office is located in which wing of the building?", answer: "west wing" },
    'c_brussels1': { id: "c_brussels1", question: "ATOMIUM: In which Belgian city was it built for the 1958 World's Fair?", answer: "brussels" },
    'c_brussels2': { id: "c_brussels2", question: "ATOMIUM: What does its shape represent?", answer: "iron crystal" },
    'c_brussels3': { id: "c_brussels3", question: "ATOMIUM: How many spheres make up the Atomium?", answer: "9" },
    'c_rushmore1': { id: "c_rushmore1", question: "MOUNT RUSHMORE: Which US state is it in?", answer: "south dakota" },
    'c_rushmore2': { id: "c_rushmore2", question: "MOUNT RUSHMORE: Name one of the four US presidents carved into the mountain.", answer: "lincoln" },
    'c_rushmore3': { id: "c_rushmore3", question: "MOUNT RUSHMORE: Is the sculpture complete as originally designed?", answer: "no" },
    'c_toronto1': { id: "c_toronto1", question: "CN TOWER: In which Canadian city is it located?", answer: "toronto" },
    'c_toronto2': { id: "c_toronto2", question: "CN TOWER: Was it the world's tallest free-standing structure when it was built?", answer: "yes" },
    'c_toronto3': { id: "c_toronto3", question: "CN TOWER: What does 'CN' originally stand for?", answer: "canadian national" },
    'c_tajmahal1': { id: "c_tajmahal1", question: "TAJ MAHAL: In which country is this famous mausoleum?", answer: "india" },
    'c_tajmahal2': { id: "c_tajmahal2", question: "TAJ MAHAL: What type of white stone is it famously made from?", answer: "marble" },
    'c_tajmahal3': { id: "c_tajmahal3", question: "TAJ MAHAL: It was built by an emperor in memory of his what?", answer: "wife" },
    'c_wall1': { id: "c_wall1", question: "GREAT WALL: Which country is it in?", answer: "china" },
    'c_wall2': { id: "c_wall2", question: "GREAT WALL: Was it built to keep out invaders from the north or south?", answer: "north" },
    'c_wall3': { id: "c_wall3", question: "GREAT WALL: True or False: It is visible from the Moon with the naked eye.", answer: "false" },
    'c_beijing1': { id: "c_beijing1", question: "FORBIDDEN CITY: In which Chinese city is it located?", answer: "beijing" },
    'c_beijing2': { id: "c_beijing2", question: "FORBIDDEN CITY: It was the imperial palace for which two dynasties?", answer: "ming and qing" },
    'c_beijing3': { id: "c_beijing3", question: "FORBIDDEN CITY: Is it now a museum?", answer: "yes" },
    'c_seattle1': { id: "c_seattle1", question: "SPACE NEEDLE: In which US city is this landmark located?", answer: "seattle" },
    'c_seattle2': { id: "c_seattle2", question: "SPACE NEEDLE: It was built for which event in 1962?", answer: "world's fair" },
    'c_seattle3': { id: "c_seattle3", question: "SPACE NEEDLE: Does it have a rotating restaurant at the top?", answer: "yes" },
    'c_dubai1': { id: "c_dubai1", question: "BURJ AL ARAB: In which city in the UAE is this hotel located?", answer: "dubai" },
    'c_dubai2': { id: "c_dubai2", question: "BURJ AL ARAB: The building is designed to look like the what of a ship?", answer: "sail" },
    'c_dubai3': { id: "c_dubai3", question: "BURJ AL ARAB: True or False: It is one of the tallest hotels in the world.", answer: "true" },
    'c_acropolis1': { id: "c_acropolis1", question: "ACROPOLIS: In which Greek city is this ancient citadel located?", answer: "athens" },
    'c_acropolis2': { id: "c_acropolis2", question: "ACROPOLIS: What is the name of the famous temple at its center?", answer: "parthenon" },
    'c_acropolis3': { id: "c_acropolis3", question: "ACROPOLIS: It was dedicated to which Greek goddess?", answer: "athena" },
    'c_london1': { id: "c_london1", question: "TOWER BRIDGE: In which UK city is this famous bridge located?", answer: "london" },
    'c_london2': { id: "c_london2", question: "TOWER BRIDGE: What is the name of the river it crosses?", answer: "thames" },
    'c_london3': { id: "c_london3", question: "TOWER BRIDGE: Is it a combined bascule (drawbridge) and suspension bridge?", answer: "yes" },
    'c_brandenburg1': { id: "c_brandenburg1", question: "BRANDENBURG GATE: In which German city is it a famous landmark?", answer: "berlin" },
    'c_brandenburg2': { id: "c_brandenburg2", question: "BRANDENBURG GATE: It once marked the start of the road from Berlin to which city?", answer: "brandenburg" },
    'c_brandenburg3': { id: "c_brandenburg3", question: "BRANDENBURG GATE: A statue of a chariot pulled by four horses sits on top. What is this called?", answer: "quadriga" },
    'c_machu1': { id: "c_machu1", question: "MACHU PICCHU: In which South American country is it located?", answer: "peru" },
    'c_machu2': { id: "c_machu2", question: "MACHU PICCHU: It is located high in which mountain range?", answer: "andes" },
    'c_machu3': { id: "c_machu3", question: "MACHU PICCHU: Which ancient civilization built this citadel?", answer: "inca" },
    'c_liberty1': { id: "c_liberty1", question: "STATUE OF LIBERTY: In which US city's harbor is it located?", answer: "new york" },
    'c_liberty2': { id: "c_liberty2", question: "STATUE OF LIBERTY: It was a gift to the United States from which country?", answer: "france" },
    'c_liberty3': { id: "c_liberty3", question: "STATUE OF LIBERTY: What is the statue holding in her right hand?", answer: "torch" },
    'c_rio1': { id: "c_rio1", question: "CHRIST THE REDEEMER: Which Brazilian city does this statue overlook?", answer: "rio de janeiro" },
    'c_rio2': { id: "c_rio2", question: "CHRIST THE REDEEMER: The statue stands on top of which mountain?", answer: "corcovado" },
    'c_rio3': { id: "c_rio3", question: "CHRIST THE REDEEMER: Is it considered one of the New Seven Wonders of the World?", answer: "yes" },
};

// --- GAME BOARD MAP (FULLY POPULATED) ---
const questionPositions = {
    1: { jungle: ['j_lion1', 'j_lion2', 'j_lion3'], city: ['c_moscow1', 'c_moscow2', 'c_moscow3'] },
    2: { jungle: ['j_rhino1', 'j_rhino2', 'j_rhino3'], city: ['c_giza1', 'c_giza2', 'c_giza3'] },
    3: { jungle: ['j_cheetah1', 'j_cheetah2', 'j_cheetah3'], city: ['c_sydney1', 'c_sydney2', 'c_sydney3'] },
    4: { jungle: ['j_elephant1', 'j_elephant2', 'j_elephant3'], city: ['c_rome1', 'c_rome2', 'c_rome3'] },
    5: { jungle: ['j_tiger1', 'j_tiger2', 'j_tiger3'], city: ['c_petra1', 'c_petra2', 'c_petra3'] },
    6: { jungle: ['j_leopard1', 'j_leopard2', 'j_leopard3'], city: ['c_hollywood1', 'c_hollywood2', 'c_hollywood3'] },
    7: { jungle: ['j_buffalo1', 'j_buffalo2', 'j_buffalo3'], city: ['c_pisa1', 'c_pisa2', 'c_pisa3'] },
    8: { jungle: ['j_snake1', 'j_snake2', 'j_snake3'], city: ['c_paris1', 'c_paris2', 'c_paris3'] },
    9: { jungle: ['j_turtle1', 'j_turtle2', 'j_turtle3'], city: ['c_washington1', 'c_washington2', 'c_washington3'] },
    10: { jungle: ['j_ostrich1', 'j_ostrich2', 'j_ostrich3'], city: ['c_brussels1', 'c_brussels2', 'c_brussels3'] },
    11: { jungle: ['j_macaw1', 'j_macaw2', 'j_macaw3'], city: ['c_rushmore1', 'c_rushmore2', 'c_rushmore3'] },
    12: { jungle: ['j_crocodile1', 'j_crocodile2', 'j_crocodile3'], city: ['c_toronto1', 'c_toronto2', 'c_toronto3'] },
    13: { jungle: ['j_giraffe1', 'j_giraffe2', 'j_giraffe3'], city: ['c_tajmahal1', 'c_tajmahal2', 'c_tajmahal3'] },
    14: { jungle: ['j_jaguar1', 'j_jaguar2', 'j_jaguar3'], city: ['c_wall1', 'c_wall2', 'c_wall3'] },
    15: { jungle: ['j_hyena1', 'j_hyena2', 'j_hyena3'], city: ['c_beijing1', 'c_beijing2', 'c_beijing3'] },
    16: { jungle: ['j_warthog1', 'j_warthog2', 'j_warthog3'], city: ['c_seattle1', 'c_seattle2', 'c_seattle3'] },
    17: { jungle: ['j_komodo1', 'j_komodo2', 'j_komodo3'], city: ['c_dubai1', 'c_dubai2', 'c_dubai3'] },
    18: { jungle: ['j_oryx1', 'j_oryx2', 'j_oryx3'], city: ['c_acropolis1', 'c_acropolis2', 'c_acropolis3'] },
    19: { jungle: ['j_gorilla1', 'j_gorilla2', 'j_gorilla3'], city: ['c_london1', 'c_london2', 'c_london3'] },
    20: { jungle: ['j_eagle1', 'j_eagle2', 'j_eagle3'], city: ['c_brandenburg1', 'c_brandenburg2', 'c_brandenburg3'] },
    21: { jungle: ['j_chimp1', 'j_chimp2', 'j_chimp3'], city: ['c_machu1', 'c_machu2', 'c_machu3'] },
    22: { jungle: ['j_heron1', 'j_heron2', 'j_heron3'], city: ['c_liberty1', 'c_liberty2', 'c_liberty3'] },
    23: { jungle: ['j_deer1', 'j_deer2', 'j_deer3'], city: ['c_rio1', 'c_rio2', 'c_rio3'] },
    24: { jungle: ['j_camel1', 'j_camel2', 'j_camel3'], city: ['c_sydney1', 'c_sydney2', 'c_sydney3'] },
    25: { jungle: ['j_impala1', 'j_impala2', 'j_impala3'], city: ['c_petra1', 'c_petra2', 'c_petra3'] },
    26: { jungle: ['j_python1', 'j_python2', 'j_python3'], city: ['c_hollywood1', 'c_hollywood2', 'c_hollywood3'] },
    27: { jungle: ['j_peacock1', 'j_peacock2', 'j_peacock3'], city: ['c_pisa1', 'c_pisa2', 'c_pisa3'] },
    28: { jungle: ['j_toucan1', 'j_toucan2', 'j_toucan3'], city: ['c_paris1', 'c_paris2', 'c_paris3'] },
    29: { jungle: ['j_hippo1', 'j_hippo2', 'j_hippo3'], city: ['c_washington1', 'c_washington2', 'c_washington3'] },
    30: { jungle: ['j_lion1', 'j_lion2', 'j_lion3'], city: ['c_brussels1', 'c_brussels2', 'c_brussels3'] },
    31: { jungle: ['j_rhino1', 'j_rhino2', 'j_rhino3'], city: ['c_rushmore1', 'c_rushmore2', 'c_rushmore3'] },
    32: { jungle: ['j_cheetah1', 'j_cheetah2', 'j_cheetah3'], city: ['c_toronto1', 'c_toronto2', 'c_toronto3'] },
    33: { jungle: ['j_elephant1', 'j_elephant2', 'j_elephant3'], city: ['c_tajmahal1', 'c_tajmahal2', 'c_tajmahal3'] },
    34: { jungle: ['j_tiger1', 'j_tiger2', 'j_tiger3'], city: ['c_wall1', 'c_wall2', 'c_wall3'] },
};


// Helper function to send a message to all clients in a specific game
function broadcastToGame(gameId, payload) {
    const game = games[gameId];
    if (game) {
        const message = JSON.stringify(payload);
        game.clients.forEach(client => {
            if (clients[client.clientId]) {
                clients[client.clientId].connection.send(message);
            }
        });
    }
}

wss.on("connection", (ws) => {
    const clientId = guid();
    clients[clientId] = { connection: ws };
    console.log(`Client connected: ${clientId}`);

    const connectPayload = { method: "connect", clientId: clientId };
    ws.send(JSON.stringify(connectPayload));

    ws.on("message", (message) => {
        console.log(`Received from client ${clientId}: ${message}`);
        const data = JSON.parse(message);

        if (data.method === "find_game") {
            const gameType = data.gameType;
            if (!gameType || (gameType !== 'jungle' && gameType !== 'city')) return;

            let availableGame = Object.values(games).find(game => 
                game.gameType === gameType && 
                game.clients.length < MAX_PLAYERS &&
                !game.state.status
            );

            if (availableGame) {
                console.log(`Game ${availableGame.id} (${gameType}) found, adding player ${clientId}.`);
                const player = 'p' + (availableGame.clients.length + 1);
                availableGame.clients.push({ clientId: clientId, player: player });
                
                const joinPayload = { method: "join", gameId: availableGame.id, player: player };
                clients[clientId].connection.send(JSON.stringify(joinPayload));
                
                if (availableGame.clients.length === MAX_PLAYERS) {
                    console.log(`Game ${availableGame.id} is now full.`);
                    if (gameType === 'jungle') {
                        console.log("Dispatching to animal selection...");
                        availableGame.state.status = 'selecting_animal';
                        const selectionPayload = { method: 'go_to_animal_selection', game: availableGame };
                        broadcastToGame(availableGame.id, selectionPayload);
                    } else {
                        console.log("Starting city game directly...");
                        availableGame.state.status = 'full';
                        startGame(availableGame.id, 'start_board');
                    }
                }
            } else {
                console.log(`No available ${gameType} games. Creating new game for player ${clientId}.`);
                const gameId = guid();
                games[gameId] = {
                    id: gameId,
                    gameType: gameType,
                    clients: [{ clientId: clientId, player: "p1" }],
                    state: { playerAnimals: {} },
                };
                const joinPayload = { method: "join", gameId: gameId, player: "p1" };
                clients[clientId].connection.send(JSON.stringify(joinPayload));
            }
        }
        
        if (data.method === "select_animal") {
            const { gameId, clientId, animal } = data;
            const game = games[gameId];
            if (!game || game.state.status !== 'selecting_animal') return;

            const client = game.clients.find(c => c.clientId === clientId);
            if (client) {
                const isTaken = Object.values(game.state.playerAnimals).includes(animal);
                if (!isTaken) {
                    game.state.playerAnimals[client.player] = animal;
                    console.log(`Player ${client.player} in game ${gameId} selected ${animal}`);
                    
                    const updatePayload = { method: 'update_selections', game: game };
                    broadcastToGame(gameId, updatePayload);

                    if (Object.keys(game.state.playerAnimals).length === game.clients.length) {
                        console.log(`All players in game ${gameId} have selected an animal. Starting board.`);
                        startGame(gameId, 'start_board');
                    }
                }
            }
        }

        if (data.method === "play") {
            const { gameId, clientId } = data;
            const game = games[gameId];
            if (!game || game.state.status !== 'playing') return;
            const movingPlayer = game.clients.find(c => c.clientId === clientId);
            const currentPlayer = game.clients[game.state.currentPlayerIndex];
            if (!movingPlayer || !currentPlayer || movingPlayer.player !== currentPlayer.player) return;

            const diceRoll = Math.floor(Math.random() * 6) + 1;
            game.state[currentPlayer.player].steps += diceRoll;
            const newSteps = game.state[currentPlayer.player].steps % 34 === 0 ? 34 : game.state[currentPlayer.player].steps % 34;
            
            game.state.lastDiceRoll = { player: currentPlayer.player, roll: diceRoll };
            game.state.lastEvent = `Player ${currentPlayer.player.toUpperCase()} rolled a ${diceRoll}.`;
            
            broadcastUpdate(gameId);

            const positionData = questionPositions[newSteps];

            if (positionData) {
                setTimeout(() => {
                    if (!games[gameId]) return;
                    const gameType = game.gameType;
                    const questionIdSet = positionData[gameType];
                    const questionSet = questionIdSet.map(id => allQuestions[id]).filter(q => q);

                    if (!questionSet || questionSet.length === 0) {
                        game.state.currentPlayerIndex = (game.state.currentPlayerIndex + 1) % game.clients.length;
                        broadcastUpdate(gameId);
                        return;
                    }

                    game.state.status = 'answering_question';
                    game.state.playerAnswering = currentPlayer.player;
                    game.state.currentQuestionSet = questionSet;
                    game.state.currentQuestionIndex = 0;

                    const firstQuestion = game.state.currentQuestionSet[0];
                    const askPayload = {
                        method: "ask_question",
                        question: firstQuestion.question,
                        playerAnswering: game.state.playerAnswering,
                        gameId: game.id,
                        questionNumber: 1,
                        totalQuestions: game.state.currentQuestionSet.length,
                    };
                    
                    if (clients[clientId]) clients[clientId].connection.send(JSON.stringify(askPayload));
                    
                    game.state.lastEvent = `Player ${currentPlayer.player.toUpperCase()} landed on a question square!`;
                    broadcastUpdate(gameId);
                }, DELAY_BEFORE_QUIZ);
            } else {
                game.state.currentPlayerIndex = (game.state.currentPlayerIndex + 1) % game.clients.length;
            }
        }
        
        if (data.method === "submit_answer") {
            const { gameId, clientId, answer } = data;
            const game = games[gameId];
            if (!game || game.state.status !== 'answering_question') return;
            const clientPlayer = game.clients.find(c => c.clientId === clientId);
            if (clientPlayer && clientPlayer.player === game.state.playerAnswering) {
                const qIndex = game.state.currentQuestionIndex;
                const currentQuestion = game.state.currentQuestionSet[qIndex];
                const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase();

                game.state.answeredQuestions.push({
                    player: clientPlayer.player,
                    question: currentQuestion.question,
                    providedAnswer: answer,
                    correctAnswer: currentQuestion.answer,
                    wasCorrect: isCorrect
                });

                if (qIndex < game.state.currentQuestionSet.length - 1) {
                    game.state.currentQuestionIndex++;
                    const nextQuestion = game.state.currentQuestionSet[game.state.currentQuestionIndex];
                    const askPayload = {
                        method: "ask_question",
                        question: nextQuestion.question,
                        playerAnswering: game.state.playerAnswering,
                        gameId: game.id,
                        questionNumber: game.state.currentQuestionIndex + 1,
                        totalQuestions: game.state.currentQuestionSet.length,
                    };
                    clients[clientId].connection.send(JSON.stringify(askPayload));
                } else {
                    game.state.lastEvent = `Player ${clientPlayer.player.toUpperCase()} finished the quiz!`;
                    game.state.status = 'playing';
                    game.state.playerAnswering = null;
                    game.state.currentQuestionSet = null;
                    game.state.currentQuestionIndex = null;
                    game.state.currentPlayerIndex = (game.state.currentPlayerIndex + 1) % game.clients.length;
                    broadcastUpdate(gameId);
                }
            }
        }
    });

    ws.on("close", () => {
        console.log(`Client disconnected: ${clientId}`);
        let gameToEnd = null;
        let gameIdToEnd = null;
        for (const gameId in games) {
            const game = games[gameId];
            const clientIndex = game.clients.findIndex(c => c.clientId === clientId);
            if (clientIndex !== -1) {
                gameToEnd = game;
                gameIdToEnd = gameId;
                break;
            }
        }
        if (gameToEnd) {
            console.log(`Player left game ${gameIdToEnd}. Ending game for all participants.`);
            const gameOverPayload = {
                method: "game_over",
                results: gameToEnd.state.answeredQuestions || [],
                gameType: gameToEnd.gameType
            };
            gameToEnd.clients.forEach(client => {
                if (client.clientId !== clientId && clients[client.clientId]) {
                    clients[client.clientId].connection.send(JSON.stringify(gameOverPayload));
                }
            });
            delete games[gameIdToEnd];
        }
        delete clients[clientId];
    });
});

function startGame(gameId, startMethod) {
    const game = games[gameId];
    if (!game) return;
    
    // Merge the new game state with any existing state (like playerAnimals)
    game.state = {
        ...game.state,
        status: 'playing',
        currentPlayerIndex: 0,
        lastDiceRoll: null,
        lastEvent: "The game has begun!",
        playerAnswering: null,
        currentQuestionSet: null,
        currentQuestionIndex: null,
        answeredQuestions: game.state.answeredQuestions || []
    };

    game.clients.forEach(client => {
        if (!game.state[client.player]) {
            game.state[client.player] = { steps: 0 };
        }
    });

    const startPayload = { method: startMethod, game: game };
    broadcastToGame(gameId, startPayload);
}

function broadcastUpdate(gameId) {
    const game = games[gameId];
    if (!game) return;
    const updatePayload = { method: "update", game: game };
    broadcastToGame(gameId, updatePayload);
}

function guid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

server.listen(9090, () => {
    console.log("Game Server is listening on port 9090");
});