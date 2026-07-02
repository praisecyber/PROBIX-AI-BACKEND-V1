const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

console.log('🚀 Kaggle Dataset Loader for Probix Predictor');

const defaultDatasetDir = path.join(__dirname, 'data');
const defaultOutputDir = path.join(__dirname, 'data');
const defaultOutputFile = path.join(defaultOutputDir, 'kaggle_training_data.json');

const argv = process.argv.slice(2);
const datasetDir = argv[0] || defaultDatasetDir;
const outputPath = argv[1] || defaultOutputFile;

if (!fs.existsSync(datasetDir)) {
  console.error('❌ kaggle_data folder not found at', datasetDir);
  process.exit(1);
}

if (!fs.existsSync(outputPath) && !fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

const files = fs.readdirSync(datasetDir);
const csvFiles = files.filter(file => file.toLowerCase().endsWith('.csv'));

if (csvFiles.length === 0) {
  console.error('❌ No CSV files found in dataset directory:', datasetDir);
  process.exit(1);
}

console.log('✅ CSV Dataset Found:');
csvFiles.forEach(f => console.log(`  - ${f}`));

const datasetFile = path.join(datasetDir, csvFiles[0]);
const results = [];

fs.createReadStream(datasetFile)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log('\n✅ Dataset Loaded Successfully');
    console.log('\n📌 Column Names:');
    console.log(Object.keys(results[0] || {}));
    console.log('\n📌 First Row:');
    console.log(results[0] || {});
    console.log(`\n📊 Total Rows: ${results.length}`);

    // Enrich with synthetic demographic fields if missing
    const ageGroups = ['Teen', 'Young_Adult', 'Adult'];
    const learningStyles = ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'];
    const techAccess = ['High-Speed Internet', 'Mobile-Only', 'Shared Device', 'Limited'];
    const nativeLangs = ['Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'English'];

    const enrichedResults = results.map(row => {
      const age = ageGroups[Math.floor(Math.random() * ageGroups.length)];
      const style = learningStyles[Math.floor(Math.random() * learningStyles.length)];
      const tech = techAccess[Math.floor(Math.random() * techAccess.length)];
      const lang = nativeLangs[Math.floor(Math.random() * nativeLangs.length)];

      let gpa = parseFloat(row.Post_Semester_GPA);
      if (!isNaN(gpa)) {
        if (tech === 'High-Speed Internet') gpa += 0.15;
        if (tech === 'Limited') gpa -= 0.20;
        if (gpa > 4.0) gpa = 4.0;
        if (gpa < 0.0) gpa = 0.0;
        row.Post_Semester_GPA = gpa.toFixed(3);
      }

      return {
        ...row,
        Age_Group: row.Age_Group || age,
        Learning_Style: row.Learning_Style || style,
        Tech_Access_Level: row.Tech_Access_Level || tech,
        Native_Language: row.Native_Language || lang
      };
    });

    const output = {
      metadata: {
        source: 'Kaggle - Impact of AI on Students (Enriched)',
        file: csvFiles[0],
        timestamp: new Date().toISOString(),
        totalRows: enrichedResults.length
      },
      data: enrichedResults
    };

    try {
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`\n💾 Saved parsed dataset to ${outputPath}`);
    } catch (err) {
      console.error('\n❌ Failed to save parsed dataset:', err.message);
      process.exit(1);
    }
  });
