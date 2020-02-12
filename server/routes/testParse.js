let info = `image | imageUrl ||
video | videoUrlMp4 ||
handover | commentText ||
resolve | commentText||
tags | 123,234,555 ||
note | noteText ||
priortiy | 0 ||
workQueue | workQueueIdName | comment || richImage | imageLinkUrl | imageTitle | imageUrl | mimeTypeOfImage ||
richVideo | videoLinkUrl | videoTitle | videoUrl | mimeTypeOfVideo ||`;

let tempTasks = info.split("||");
let finalTasks = [];
tempTasks.forEach(task => {
  let taskInstructions = task.split("|");
  let finalTaskInstructions = [];
  taskInstructions.forEach(instruction => {
    let finalInstruction = instruction.replace(/  |\r\n|\n|\r/gm, "");
    finalInstruction = instruction.trim();
    if (finalInstruction !== "") {
      finalTaskInstructions.push(finalInstruction);
    }
  });
  if (finalTaskInstructions.length > 0) {
    finalTasks.push(finalTaskInstructions);
  }
});

console.log(finalTasks);

let testString = "1234,534656, 767454324  ";
console.log(testString.split(/\s*,\s*/).map(Number));
