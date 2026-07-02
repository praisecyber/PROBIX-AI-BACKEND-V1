const fs = require('fs');
const path = require('path');

class ProbixPredictor {
  constructor() {
    this.model = null;
    this.modelPath = path.join(__dirname, 'models', 'student_predictive_model.json');
  }

  loadModel() {
    try {
      // Primary path (module-local)
      if (!fs.existsSync(this.modelPath)) {
        const candidateDirs = [
          path.join(__dirname, '..', 'models'),
          path.join(__dirname, '..', 'nllb-translator', 'models'),
          path.join(__dirname, '..', '..', 'nllb-translator', 'models')
        ];

        for (const dir of candidateDirs) {
          const candidatePath = path.join(dir, path.basename(this.modelPath));
          if (fs.existsSync(candidatePath)) {
            this.modelPath = candidatePath;
            break;
          }
        }

        if (!fs.existsSync(this.modelPath)) {
          const searchDirs = [
            path.join(__dirname, '..', 'models'),
            path.join(__dirname, '..', 'nllb-translator', 'models'),
            path.join(__dirname, '..', '..', 'nllb-translator', 'models')
          ];

          for (const dir of searchDirs) {
            if (!fs.existsSync(dir)) continue;
            const files = fs.readdirSync(dir).filter(f => f.startsWith(path.basename(this.modelPath)));
            if (files.length > 0) {
              this.modelPath = path.join(dir, files[0]);
              break;
            }
          }
        }
      }

      if (!fs.existsSync(this.modelPath)) {
        throw new Error(`Model file not found: ${this.modelPath}. Run 'npm run train:predictive' first.`);
      }

      this.model = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
      console.log(`✅ Predictive model loaded from ${this.modelPath}`);
      console.log(`   Target field: ${this.model.targetField}`);
      console.log(`   Training rows: ${this.model.rows}`);
      console.log(`   RMSE: ${this.model.rmse.toFixed(4)}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to load predictive model:`, error.message);
      return false;
    }
  }

  encodeSample(sampleData) {
    if (!this.model) throw new Error('Model not loaded.');
    
    const features = [];
    
    this.model.numericFields.forEach(field => {
      features.push(Number(sampleData[field] ?? 0));
    });
    
    this.model.categoricalFields.forEach(field => {
      const value = sampleData[field] == null ? 'UNKNOWN' : String(sampleData[field]).trim();
      const values = this.model.categoryMaps[field] || [];
      values.forEach(v => features.push(v === value ? 1 : 0));
    });
    
    return features;
  }

  predict(sampleData) {
    if (!this.model) throw new Error('Model not loaded.');
    
    const weights = this.model.coefficients;
    const intercept = this.model.intercept;
    
    if (!Array.isArray(weights) || !Array.isArray(weights[0])) {
      throw new Error('Invalid model weights structure.');
    }
    
    const features = this.encodeSample(sampleData);
    let output = Array.isArray(intercept) ? intercept[0] || 0 : intercept || 0;
    
    for (let i = 0; i < features.length; i++) {
      output += features[i] * weights[i][0];
    }
    
    return output;
  }

  predictBatch(samples) {
    if (!this.model) throw new Error('Model not loaded.');
    return samples.map(sample => ({
      input: sample,
      prediction: this.predict(sample)
    }));
  }

  getModelInfo() {
    if (!this.model) return null;
    return {
      targetField: this.model.targetField,
      numericFields: this.model.numericFields,
      categoricalFields: this.model.categoricalFields,
      trainingRows: this.model.rows,
      rmse: this.model.rmse,
      timestamp: this.model.timestamp
    };
  }
}

module.exports = { ProbixPredictor };