import { useMigrationStore, WizardStep } from './store/migrationStore.js';
import ConfigSummaryScreen from './components/ConfigSummaryScreen.js';
import Step1ConfigMode from './components/Step1ConfigMode.js';
import Step10DataLoading from './components/Step10DataLoading.js';
import Step2SourceOrg from './components/Step2SourceOrg.js';
import Step3TargetOrgs from './components/Step3TargetOrgs.js';
import Step4ObjectSelection from './components/Step4ObjectSelection.js';
import Step5FieldSelection from './components/Step5FieldSelection.js';
import Step6FilterConfig from './components/Step6FilterConfig.js';
import Step7Extraction from './components/Step7Extraction.js';
import Step8TargetSelection from './components/Step8TargetSelection.js';
import Step9PermissionValidation from './components/Step9PermissionValidation.js';

const STEP_ORDER: WizardStep[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function App() {
  const { step, setStep } = useMigrationStore();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1>SF-Migrator</h1>
      <p>Step {step} of 10 — local-first Salesforce migration.</p>

      {step === 1 && <Step1ConfigMode />}
      {step === 2 && <Step2SourceOrg />}
      {step === 3 && <Step3TargetOrgs />}
      {step === 4 && <Step4ObjectSelection />}
      {step === 5 && <Step5FieldSelection />}
      {step === 6 && <Step6FilterConfig />}
      {step === 7 && <Step7Extraction />}
      {step === 8 && <Step8TargetSelection />}
      {step === 9 && <Step9PermissionValidation />}
      {step === 10 && <Step10DataLoading />}
      {step === 'summary' && <ConfigSummaryScreen />}

      <nav style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button
          disabled={step === 1}
          onClick={() => setStep(STEP_ORDER[Math.max(0, STEP_ORDER.indexOf(step as WizardStep) - 1)])}
        >
          Back
        </button>
        <button onClick={() => setStep('summary')}>Review summary</button>
        <button
          disabled={step === 10}
          onClick={() => setStep(STEP_ORDER[Math.min(9, STEP_ORDER.indexOf(step as WizardStep) + 1)])}
        >
          Next
        </button>
      </nav>
    </main>
  );
}
