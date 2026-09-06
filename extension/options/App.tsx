import React, { useState } from 'react';
import { useMigrationStore } from './store/migrationStore';
import Step1ConfigMode from './components/Step1ConfigMode';
import Step2SourceOrg from './components/Step2SourceOrg';
import Step3TargetOrgs from './components/Step3TargetOrgs';
import Step4ObjectSelection from './components/Step4ObjectSelection';
import Step5FieldSelection from './components/Step5FieldSelection';
import Step6FilterConfig from './components/Step6FilterConfig';
import Step7Extraction from './components/Step7Extraction';
import Step8TargetSelection from './components/Step8TargetSelection';
import Step9PermissionValidation from './components/Step9PermissionValidation';
import Step10DataLoading from './components/Step10DataLoading';

const steps = [
  { id: 1, label: 'Config Mode' },
  { id: 2, label: 'Source Org' },
  { id: 3, label: 'Target Orgs' },
  { id: 4, label: 'Objects' },
  { id: 5, label: 'Fields' },
  { id: 6, label: 'Filters' },
  { id: 7, label: 'Extraction' },
  { id: 8, label: 'Target Select' },
  { id: 9, label: 'Validation' },
  { id: 10, label: 'Data Loading' },
];

const App: React.FC = () => {
  const { currentStep, configMode, setStep } = useMigrationStore();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const goToStep = (step: number) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setStep(step);
    }
  };

  const markStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ConfigMode onComplete={() => markStepComplete(1)} />;
      case 2:
        return <Step2SourceOrg onComplete={() => markStepComplete(2)} />;
      case 3:
        return <Step3TargetOrgs onComplete={() => markStepComplete(3)} />;
      case 4:
        return <Step4ObjectSelection onComplete={() => markStepComplete(4)} />;
      case 5:
        return <Step5FieldSelection onComplete={() => markStepComplete(5)} />;
      case 6:
        return <Step6FilterConfig onComplete={() => markStepComplete(6)} />;
      case 7:
        return <Step7Extraction onComplete={() => markStepComplete(7)} />;
      case 8:
        return <Step8TargetSelection onComplete={() => markStepComplete(8)} />;
      case 9:
        return <Step9PermissionValidation onComplete={() => markStepComplete(9)} />;
      case 10:
        return <Step10DataLoading onComplete={() => markStepComplete(10)} />;
      default:
        return <Step1ConfigMode onComplete={() => markStepComplete(1)} />;
    }
  };

  const handleNext = () => {
    if (currentStep < 10) {
      setStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  };

  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'active';
    return '';
  };

  return (
    <div className="wizard-container">
      <header className="wizard-header">
        <h1>SF-Migrator Web Extension</h1>
        <p>Configure and execute Salesforce data migrations</p>
      </header>

      <nav className="progress-steps" aria-label="Migration wizard progress">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`step ${getStepStatus(step.id)}`}
            onClick={() => goToStep(step.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && goToStep(step.id)}
          >
            <div className="step-number">{step.id}</div>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </nav>

      <main>
        {renderStep()}

        <div className="wizard-navigation">
          <button
            className="btn btn-secondary"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={currentStep === 10 || !completedSteps.includes(currentStep)}
          >
            {currentStep === 10 ? 'Finish' : 'Next'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
