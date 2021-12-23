const bringApi = require(`bring-shopping`);

/**
 * Splits the name of a shopping list item into the actual name and the quanity with unit.
 * Only german numbers and units supported.
 * E.g. "zwei und zwanzig milliliter mehl" => {quantity: "22 ml", type: "mehl"}
 * 
 * @param {string} sentence The name of a shopping list item 
 * @returns 
 */
async function toItem(sentence) {
    // units to abbreviation converters
    const units = {
        "gramm": unit => "g",
        "liter": unit => "l",
        "milliliter": unit => "ml",
        "kilo": unit => "kg",
        "Kilogramm": unit => "kg",
        "löffel": unit => "EL",
        "esslöffel": unit => "EL",
        "teelöffel": unit => "TL"
    }

    // Written numbers to operator converters
    const numbers = {
        "und": num => num,
        "ein": num => num + 1,
        "eins": num => num + 1,
        "zwei": num => num + 2,
        "drei": num => num + 3,
        "vier": num => num + 4,
        "fünf": num => num + 5,
        "sechs": num => num + 6,
        "sieben": num => num + 7,
        "acht": num => num + 8,
        "neun": num => num + 9,
    }

    // Written tens to operator converters 
    const tens = {
        "zehn": num => num + 10,
        "zwanzig": num => num + 20,
        "dreißig": num => num + 30,
        "vierzig": num => num + 40,
        "fünfzig": num => num + 50,
        "sechzig": num => num + 60,
        "siebzig": num => num + 70,
        "achtzig": num => num + 80,
        "neunzig": num => num + 90
    }

    // written multiplier to operator converters
    const muliplier = {
        "hundert": unit => unit ? unit * 100 : 100,
        "tausend": unit => unit * 1000,
    }
    number = 0;
    rendered = [];
    subject = [];
    // go through each word
    for (let word of sentence.toLowerCase().split(" ")) {
        // check if we find a written number
        if (word in numbers) {
            number = numbers[word](number)
        }
        // or a tenner
        else if (word in tens) {
            number = tens[word](number)
        }
        // or multiplicator
        else if (word in muliplier) {
            number = muliplier[word](number)
        }
        // or a normal word or unit
        else {
            // if we find a normal word and we found numbers previously, write them to the 
            // quantity field first and reset the number variable
            if (number > 0) {
                rendered.push(number.toString())
                number = 0
            }
            // check if the word is a unit
            if (word in units) {
                rendered.push(units[word]())
            } 
            // or we really got a normal word
            else {
                subject.push(word)
            }
        }
    }
    // join the type (or actuall name) words to a string
    var type = subject.join(" ")
    // make the first letter of the name upper case
    type = type.charAt(0).toUpperCase() + type.slice(1)
    return {
        quantity: rendered.join(" "),
        type: type,
        transformed: rendered.length > 0
    }
}

/**
 * Tests the toItem function.
 * 
 * @returns {boolean} If the the was successfull or not
 */
async function test() {
    console.log("start tests...")
    // all test cases
    const tests = [
        {
            test: "zwei hundert gramm butter",
            quantity: "200 g",
            type: "Butter"
        },
        {
            test: "zwei hundert zwanzig gramm butter",
            quantity: "220 g",
            type: "Butter"
        },
        {
            test: "butter fünfzig gramm",
            quantity: "50 g",
            type: "Butter"
        },
        {
            test: "zwei und zwanzig milliliter mehl",
            quantity: "22 ml",
            type: "Mehl"
        },
        {
            test: "vier esslöffel kakao",
            quantity: "4 EL",
            type: "Kakao"
        },
        {
            test: "hundert fünf und zwanzig kilo bohnen",
            quantity: "125 kg",
            type: "Bohnen"
        },
        {
            test: "Bohnen",
            quantity: "",
            type: "Bohnen"
        }
    ];
    allTestsFine = true;
    // go through each test case
    for (let test of tests) {
        const {quantity, type} = await toItem(test.test);
        // check if quantity string is the same
        if (quantity != test.quantity) {
            allTestsFine = false;
            console.log(quantity, ">>", test.test)
        }
        // check if the name is the same
        if (type != test.type) {
            allTestsFine = false;
            console.log(type, ">>", test.test)
        }
    }
    console.log("tests done...")
    return allTestsFine;
}

/**
 * Logs into the Bring API.
 * Mail and password has to be set through enviroment variables BRING_USER_MAIL and BRING_USER_PASSWORD
 * 
 * @returns 
 */
async function login(){
    const bring = new bringApi({ mail: process.env.BRING_USER_MAIL, password: process.env.BRING_USER_PASSWORD });
    try {
        await bring.login();
        console.log(`Successfully logged in as ${bring.name}`);
    } catch (e) {
        console.error(`Error on Login: ${e.message}`);
    }
    return bring;
}

var bring = null

/**
 * Iterates through the items of the first shopping list and checks if the name contains quanitity and unit.
 * If so, if executes the toItem function to seperate name and specification.
 * 
 * @returns 
 */
async function main() {

    // check if already logged in
    if(bring == null){
        // run tests
        var testResult = await test()
        if(!testResult){
            process.exit(1);
        }
        // if tests were successful login
        bring = await login();
    }
    
    // get list ids
    const lists = await bring.loadLists();
    // get id of the first list
    const listId = lists.lists[0].listUuid
    // get the list' items
    const items = await bring.getItems(listId);
    // iterate through all items
    for(let item of items.purchase){
        // run the toItem function
        const {quantity, type, transformed} = await toItem(item.name);
        // if a transformation was made replace the original item with the new one
        if(transformed){
            console.log(item.name, ">>", type, ">", quantity)
            await bring.removeItem(listId, item.name)
            await bring.saveItem(listId, type, quantity)
        }
    }
}

// run the script each 10 seconds
setInterval(main, 10000);