const fs = require("fs");
const path = require("path");

const BollywoodDialogueDB = require("../models/BollywoodDialogue");

/**
 * Seeder for Bollywood Dialogues
 * - Prevents duplicate templates
 * - Safe to run multiple times
 * - Validates required fields
 */

async function seedBollywoodDialogues() {
  try {

    // JSON file path
    const filePath = path.join(
      __dirname,
      "../data/bollywoodDialogues.json"
    );

    // Read file
    const rawData = fs.readFileSync(filePath, "utf-8");

    // Parse JSON
    const dialogues = JSON.parse(rawData);

    if (!Array.isArray(dialogues)) {
      console.log("❌ JSON must contain an array");
      return;
    }

    console.log(`📦 Total dialogues in file: ${dialogues.length}`);

    let inserted = 0;
    let skipped = 0;

    for (const dialogue of dialogues) {

      try {

        // Validation
        if (
          !dialogue.style ||
          !dialogue.template
        ) {
          console.log("⚠️ Invalid dialogue skipped");
          skipped++;
          continue;
        }

        const normalizedTemplate =
          dialogue.template.trim();

        // Duplicate check
        const existing =
          await BollywoodDialogueDB.findOne({
            template: normalizedTemplate
          });

        if (existing) {
          console.log(`⏭️ Already exists`);
          skipped++;
          continue;
        }

        // Insert
        await BollywoodDialogueDB.create({
          style: dialogue.style,
          template: normalizedTemplate,
          variables: {
            items:
              dialogue.variables?.items || [],
            outcomes:
              dialogue.variables?.outcomes || []
          },
          isPopular:
            dialogue.isPopular || false
        });

        console.log(`✅ Added (${dialogue.style})`);

        inserted++;

      } catch (err) {

        console.log(
          "❌ Error inserting one dialogue:",
          err.message
        );

      }
    }

    console.log("\n=========================");
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log("=========================\n");

  } catch (err) {

    console.log(
      "❌ Seeder Error:",
      err.message
    );

  }
}

module.exports = seedBollywoodDialogues;