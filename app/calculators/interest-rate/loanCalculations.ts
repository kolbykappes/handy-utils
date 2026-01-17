// Loan calculation formulas
// M = P * [r(1 + r)^n] / [(1 + r)^n - 1]
// Where:
// M = Monthly payment
// P = Principal (initial balance)
// r = Monthly interest rate (annual rate / 12 / 100)
// n = Number of months (term)

export interface LoanParams {
  principal?: number;
  monthlyPayment?: number;
  annualInterestRate?: number;
  termMonths?: number;
}

export interface CalculationResult {
  principal: number;
  monthlyPayment: number;
  annualInterestRate: number;
  termMonths: number;
  totalPaid: number;
  totalInterest: number;
  calculatedField: string;
}

// Calculate monthly payment given principal, rate, and term
function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (annualRate === 0) {
    return principal / termMonths;
  }

  const monthlyRate = annualRate / 12 / 100;
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;

  return numerator / denominator;
}

// Calculate principal given monthly payment, rate, and term
function calculatePrincipal(
  monthlyPayment: number,
  annualRate: number,
  termMonths: number
): number {
  if (annualRate === 0) {
    return monthlyPayment * termMonths;
  }

  const monthlyRate = annualRate / 12 / 100;
  const numerator = monthlyPayment * (Math.pow(1 + monthlyRate, termMonths) - 1);
  const denominator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);

  return numerator / denominator;
}

// Calculate term given principal, monthly payment, and rate
function calculateTerm(
  principal: number,
  monthlyPayment: number,
  annualRate: number
): number {
  if (annualRate === 0) {
    return principal / monthlyPayment;
  }

  const monthlyRate = annualRate / 12 / 100;

  // Check if payment is sufficient
  if (monthlyPayment <= principal * monthlyRate) {
    throw new Error("Monthly payment is too low to pay off the loan");
  }

  const numerator = Math.log(monthlyPayment / (monthlyPayment - principal * monthlyRate));
  const denominator = Math.log(1 + monthlyRate);

  return numerator / denominator;
}

// Calculate interest rate using Newton-Raphson method
function calculateInterestRate(
  principal: number,
  monthlyPayment: number,
  termMonths: number
): number {
  // Check if zero interest rate works
  if (Math.abs(principal / termMonths - monthlyPayment) < 0.01) {
    return 0;
  }

  // Initial guess: 5% annual rate
  let annualRate = 5.0;
  let iterations = 0;
  const maxIterations = 100;
  const tolerance = 0.0001;

  while (iterations < maxIterations) {
    const monthlyRate = annualRate / 12 / 100;

    // Function: f(r) = P * [r(1+r)^n] / [(1+r)^n - 1] - M
    const onePlusR = 1 + monthlyRate;
    const onePlusRPowN = Math.pow(onePlusR, termMonths);

    const f =
      (principal * monthlyRate * onePlusRPowN) / (onePlusRPowN - 1) -
      monthlyPayment;

    // Derivative: f'(r) using finite difference
    const delta = 0.00001;
    const monthlyRate2 = (annualRate + delta) / 12 / 100;
    const onePlusR2 = 1 + monthlyRate2;
    const onePlusRPowN2 = Math.pow(onePlusR2, termMonths);

    const f2 =
      (principal * monthlyRate2 * onePlusRPowN2) / (onePlusRPowN2 - 1) -
      monthlyPayment;

    const derivative = (f2 - f) / delta;

    if (Math.abs(derivative) < 1e-10) {
      break;
    }

    const newRate = annualRate - f / derivative;

    if (Math.abs(newRate - annualRate) < tolerance) {
      return newRate;
    }

    annualRate = newRate;

    // Ensure rate stays positive
    if (annualRate < 0) {
      annualRate = 0.01;
    }

    iterations++;
  }

  return annualRate;
}

export function calculateLoan(params: LoanParams): CalculationResult {
  const { principal, monthlyPayment, annualInterestRate, termMonths } = params;

  // Count how many parameters are provided
  const providedCount = [principal, monthlyPayment, annualInterestRate, termMonths]
    .filter((val) => val !== undefined && val !== null)
    .length;

  if (providedCount !== 3) {
    throw new Error("Exactly 3 of the 4 fields must be provided");
  }

  let result: CalculationResult;

  // Calculate the missing field
  if (monthlyPayment === undefined) {
    // Calculate monthly payment
    const calculatedPayment = calculateMonthlyPayment(
      principal!,
      annualInterestRate!,
      termMonths!
    );
    result = {
      principal: principal!,
      monthlyPayment: calculatedPayment,
      annualInterestRate: annualInterestRate!,
      termMonths: termMonths!,
      totalPaid: calculatedPayment * termMonths!,
      totalInterest: calculatedPayment * termMonths! - principal!,
      calculatedField: "monthlyPayment",
    };
  } else if (principal === undefined) {
    // Calculate principal
    const calculatedPrincipal = calculatePrincipal(
      monthlyPayment!,
      annualInterestRate!,
      termMonths!
    );
    result = {
      principal: calculatedPrincipal,
      monthlyPayment: monthlyPayment!,
      annualInterestRate: annualInterestRate!,
      termMonths: termMonths!,
      totalPaid: monthlyPayment! * termMonths!,
      totalInterest: monthlyPayment! * termMonths! - calculatedPrincipal,
      calculatedField: "principal",
    };
  } else if (termMonths === undefined) {
    // Calculate term
    const calculatedTerm = calculateTerm(
      principal!,
      monthlyPayment!,
      annualInterestRate!
    );
    result = {
      principal: principal!,
      monthlyPayment: monthlyPayment!,
      annualInterestRate: annualInterestRate!,
      termMonths: calculatedTerm,
      totalPaid: monthlyPayment! * calculatedTerm,
      totalInterest: monthlyPayment! * calculatedTerm - principal!,
      calculatedField: "termMonths",
    };
  } else {
    // Calculate interest rate
    const calculatedRate = calculateInterestRate(
      principal!,
      monthlyPayment!,
      termMonths!
    );
    result = {
      principal: principal!,
      monthlyPayment: monthlyPayment!,
      annualInterestRate: calculatedRate,
      termMonths: termMonths!,
      totalPaid: monthlyPayment! * termMonths!,
      totalInterest: monthlyPayment! * termMonths! - principal!,
      calculatedField: "annualInterestRate",
    };
  }

  return result;
}
