import { useMigrationStore, WizardStep } from './store/migrationStore';
import ConfigSummaryScreen from './components/ConfigSummaryScreen';
import Step1ConfigMode from './components/Step1ConfigMode';
import Step10DataLoading from './components/Step10DataLoading';
import Step2SourceOrg from './components/Step2SourceOrg';
import Step3TargetOrgs from './components/Step3TargetOrgs';
import Step4ObjectSelection from './components/Step4ObjectSelection';
import Step5FieldSelection from './components/Step5FieldSelection';
import Step6FilterConfig from './components/Step6FilterConfig';
import Step7Extraction from './components/Step7Extraction';
import Step8TargetSelection from './components/Step8TargetSelection';
import Step9PermissionValidation from './components/Step9PermissionValidation';

const STEP_ORDER: WizardStep[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function prevStep(step: WizardStep): WizardStep {
  if (step === 'summary') return 10;
  return STEP_ORDER[Math.max(0, STEP_ORDER.indexOf(step) - 1)];
}

function nextStep(step: WizardStep): WizardStep {
  if (step === 'summary') return 'summary';
  return STEP_ORDER[Math.min(STEP_ORDER.length - 1, STEP_ORDER.indexOf(step) + 1)];
}

/** Console chassis: brass nameplate, LED preset stepper, transport nav. */
export default function App() {
  const { step, setStep } = useMigrationStore();
  const onSummary = step === 'summary';
  const position = onSummary ? 10 : STEP_ORDER.indexOf(step);

  return (
    <main className="ui-desk">
      <header className="ui-header">
        <div className="ui-plate">
          <h1>SF-MIGRATOR</h1>
        </div>
        <p className="ui-sub">
          {onSummary
            ? 'Review — local-first migration'
            : `Program ${step} of 10 — local-first migration`}
        </p>
        <div className="ui-stepper" role="navigation" aria-label="Wizard steps">
          {STEP_ORDER.map((n, i) => (
            <button
              key={n}
              className={`ui-pip${n === step ? ' lit' : ''}${i < position ? ' done' : ''}`}
              onClick={() => setStep(n)}
              title={`Step ${n}`}
              aria-label={`Go to step ${n}`}
              aria-current={n === step ? 'step' : undefined}
            >
              {n}
            </button>
          ))}
          <button
            className={`ui-pip${onSummary ? ' lit' : ''}`}
            onClick={() => setStep('summary')}
            title="Summary"
            aria-label="Go to summary"
            aria-current={onSummary ? 'step' : undefined}
          >
            ✓
          </button>
        </div>
      </header>

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

      <nav className="ui-nav">
        <button className="ui-btn" disabled={step === 1} onClick={() => setStep(prevStep(step))}>
          ◀ Back
        </button>
        <button className="ui-btn" onClick={() => setStep('summary')}>
          Review summary
        </button>
        <button
          className="ui-btn ui-btn-primary"
          disabled={onSummary || step === 10}
          onClick={() => setStep(nextStep(step))}
        >
          Next ▶
        </button>
      </nav>
    </main>
  );
}
