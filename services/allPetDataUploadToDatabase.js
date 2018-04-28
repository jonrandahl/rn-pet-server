const fs = require("fs");const path = require("path");const readline = require("readline");const dataLocation = "../public/PetsData";const setting = require("../config/appSetting");const keys = require("../config/credential");const allPetDataUploadToDatabase = db => {  let fileIndex = 1;  const rescueGroupAPIKey = keys.devKeys.RescueGroups_ApiKey;  while (fileIndex > 0) {    let fileName = //"test_" + fileIndex + ".json";      rescueGroupAPIKey + "_pets_" + fileIndex + ".json";    let filePath = path.join(__dirname, dataLocation, fileName);    if (validateFileExist(filePath)) {      dataParse(filePath, fileIndex, db);      fileIndex++;    } else {      fileIndex = -1;    }  }};const dataParse = (filePath, fileIndex, db) => {  let petsArray = [];  let total = 0;  // firestore write limit for single batch => size:10MB, doc amount: 500, rate: 1/s  const docAmountPerBatch = setting.firestore.docAmountPerBatch;  const docRef = db.collection(setting.firestore.petsCollectionName);  const rl = readline.createInterface({    input: fs.createReadStream(filePath),    terminal: false  });  let linePointer = 1;  rl.on("line", line => {    let petObj = JSON.parse(line);    petsArray.push(petObj);    if (linePointer % docAmountPerBatch === 0) {      console.log(        `Pause: file(${fileIndex})'s ReadStream batch limit(${docAmountPerBatch}) reached. -- Line Pointer: ${linePointer} -- temp array size: ${          petsArray.length        }`      );      rl.pause();    }    linePointer++;  });  rl.on("pause", () => {    let batch = db.batch();    petsArray.map(pet => {      let ref = docRef.doc(pet.animalID);      batch.set(ref, pet);    });    batch      .commit()      .then(result => {        console.log(          `Resume: file(${fileIndex}) committed ${result.length} documents`        );        total += petsArray.length;        // after committed batch, reset the temp array for next use.        petsArray = [];        rl.resume();      })      .catch(err => {        console.log("err", err);      });  });  rl.on("close", () => {    console.log("========================================");    console.log(`file(index ${fileIndex} on close, total ${total} objects commit succeed`);    console.log("========================================");  });};const validateFileExist = path => {  try {    return fs.statSync(path).isFile();  } catch (e) {    return false;  }};module.exports = allPetDataUploadToDatabase;