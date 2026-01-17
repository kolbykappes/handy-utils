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
    const payment = principal / termMonths;
    if (!isFinite(payment) || payment <= 0) {
      throw new Error("Unable to calculate a valid monthly payment with these parameters");
    }
    return payment;
  }

  const monthlyRate = annualRate / 12 / 100;
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;

  const payment = numerator / denominator;

  // Validate the result
  if (!isFinite(payment) || payment <= 0) {
    throw new Error("Unable to calculate a valid monthly payment with these parameters");
  }

  return payment;
}

// Calculate principal given monthly payment, rate, and term
function calculatePrincipal(
  monthlyPayment: number,
  annualRate: number,
  termMonths: number
): number {
  if (annualRate === 0) {
    const principal = monthlyPayment * termMonths;
    if (!isFinite(principal) || principal <= 0) {
      throw new Error("Unable to calculate a valid principal with these parameters");
    }
    return principal;
  }

  const monthlyRate = annualRate / 12 / 100;
  const numerator = monthlyPayment * (Math.pow(1 + monthlyRate, termMonths) - 1);
  const denominator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);

  const principal = numerator / denominator;

  // Validate the result
  if (!isFinite(principal) || principal <= 0) {
    throw new Error("Unable to calculate a valid principal with these parameters");
  }

  return principal;
}

// Calculate term given principal, monthly payment, and rate
function calculateTerm(
  principal: number,
  monthlyPayment: number,
  annualRate: number
): number {
  if (annualRate === 0) {
    const term = principal / monthlyPayment;
    if (term <= 0 || !isFinite(term)) {
      throw new Error("Unable to calculate a valid loan term with these parameters");
    }
    return term;
  }

  const monthlyRate = annualRate / 12 / 100;
  const minPayment = principal * monthlyRate;

  // Check if payment is sufficient
  if (monthlyPayment <= minPayment) {
    throw new Error(
      `Monthly payment ($${monthlyPayment.toFixed(2)}) is too low to pay off the loan. At ${annualRate.toFixed(2)}% interest, you need at least $${(minPayment + 0.01).toFixed(2)}/month just to cover the interest.`
    );
  }

  const numerator = Math.log(monthlyPayment / (monthlyPayment - principal * monthlyRate));
  const denominator = Math.log(1 + monthlyRate);

  const term = numerator / denominator;

  // Validate the result
  if (!isFinite(term) || term <= 0) {
    throw new Error("Unable to calculate a valid loan term with these parameters");
  }

  // Check for unreasonably long terms (more than 100 years)
  if (term > 1200) {
    throw new Error(
      `The calculated term is unreasonably long (${(term / 12).toFixed(1)} years). Please check your inputs.`
    );
  }

  return term;
}

// Calculate interest rate using Newton-Raphson method
function calculateInterestRate(
  principal: number,
  monthlyPayment: number,
  termMonths: number
): number {
  // Check if payment is less than principal divided by term - this indicates negative interest
  const minPayment = principal / termMonths;
  if (monthlyPayment < minPayment * 0.99) {
    throw new Error(
      `Monthly payment ($${monthlyPayment.toFixed(2)}) is too low. With this payment, you would never pay off the loan. Minimum payment needed: $${minPayment.toFixed(2)}`
    );
  }

  // Check if zero interest rate works
  if (Math.abs(minPayment - monthlyPayment) < 0.01) {
    return 0;
  }

  // Check if payment is unreasonably high (would indicate negative or impossible interest rate)
  if (monthlyPayment > principal) {
    throw new Error(
      "Monthly payment is higher than the principal amount, which suggests an invalid scenario"
    );
  }

  // Initial guess: 5% annual rate
  let annualRate = 5.0;
  let iterations = 0;
  const maxIterations = 100;
  const tolerance = 0.0001;
  let lastRate = annualRate;

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

    lastRate = annualRate;
    annualRate = newRate;

    // Ensure rate stays positive and reasonable
    if (annualRate < 0) {
      annualRate = 0.01;
    }

    // Ensure rate doesn't exceed reasonable bounds (e.g., 100%)
    if (annualRate > 100) {
      throw new Error(
        "Unable to calculate a reasonable interest rate. Please check your inputs."
      );
    }

    iterations++;
  }

  // If we hit max iterations, check if we got close enough
  if (iterations >= maxIterations) {
    throw new Error(
      "Unable to calculate interest rate with the given parameters. The values may be inconsistent."
    );
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
