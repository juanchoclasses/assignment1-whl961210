import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";


export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number

  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;

  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * Evaluates a given formula.
    * @param formula - The formula to evaluate, represented as an array of tokens.
    */

  evaluate(formula: FormulaType) {
    // Reset error flags and messages from previous evaluations
    this._errorOccured = false;
    this._errorMessage = "";
    // Initialize stacks for values and operators
    const values: number[] = [];
    const operators: TokenType[] = [];
    const length = formula.length;
    let elementCounter = 0;
    // Check for invalid trailing operator
    if (formula.length > 3 && this.isOperator(formula[length - 1]) == true && this.isOperator(formula[length - 2]) == false) {
      formula = formula.slice(0, length - 1);
      this._errorMessage = ErrorMessages.invalidFormula;
      this._errorOccured = true;
    }
    // Check for missing expression inside parentheses
    if (formula.length === 2 && formula[0] === "(" && formula[1] === ")") {
      this._errorMessage = ErrorMessages.missingParentheses;
      this._errorOccured = true;
      this._result = 0;
      return;
    }
    // Check for division by zero at the end of the formula
    if (Number(formula[length - 1]) == 0 && formula[length - 2] == "/") {
      this._errorMessage = ErrorMessages.divideByZero;
      this._errorOccured = true;
      this._result = Infinity;
      return;
    }
    // Check for empty formula
    if (formula.length === 0) {
      this._errorMessage = ErrorMessages.emptyFormula;
      this._errorOccured = true;
      return;
    }
    //check for if no integers in the formula
    for (let j = 0; j < formula.length; j++) {
      if (typeof Number(formula[j]) == "undefined") {
        elementCounter = elementCounter + 1;
      }
    }
    if (elementCounter == formula.length) {
      this._errorMessage = ErrorMessages.invalidFormula;
      this._errorOccured = true;
      this._result = 0;
      return;
    }
    // Process each token in the formula
    for (let i = 0; i < formula.length; i++) {
      const token = formula[i];
      // Push numbers onto the value stack
      if (this.isNumber(token)) {
        values.push(Number(token));
        // Handle cell references by getting their values
      } else if (this.isCellReference(token)) {
        const [value, error] = this.getCellValue(token);
        if (error) {
          this._errorMessage = error;
          this._errorOccured = true;
          return;
        }
        values.push(value);
        // Handle opening parentheses by pushing onto operator stack
      } else if (token === "(") {
        operators.push(token);
        // Handle closing parentheses by evaluating operators until matching opening parentheses
      } else if (token === ")") {
        while (operators.length && operators[operators.length - 1] !== "(") {
          this.evaluateOperator(values, operators);
        }
        operators.pop();  // remove "("
        // Handle operators by evaluating higher precedence operators, then pushing onto operator stack
      } else if (this.isOperator(token)) {
        while (
          operators.length &&
          this.precedence(operators[operators.length - 1]) >= this.precedence(token)
        ) {
          this.evaluateOperator(values, operators);
        }
        operators.push(token);
        // Handle invalid tokens

      } else {
        this._errorMessage = ErrorMessages.invalidFormula;
        this._errorOccured = true;
        return;
      }
    }
    // Evaluate remaining operators
    while (operators.length) {
      this.evaluateOperator(values, operators);
    }
    // Check for invalid final state, set result if valid, set error otherwise
    if (values.length !== 1 || isNaN(values[0])) {
      this._errorMessage = this._errorMessage || ErrorMessages.invalidFormula;
      this._result = Number(formula[0]);
      this._errorOccured = true;
      return;
    } else if (values.length !== 1) {
      this._errorMessage = this._errorMessage || ErrorMessages.invalidFormula;
      this._result = 0;
      this._errorOccured = true;
    } else {
      this._result = values.pop()!;// Set result to final value
    }

  }


  /**
    * @returns The error message from the last evaluation, if any.
    */

  public get error(): string {
    return this._errorMessage
  }
  /**
   * @returns The result of the last evaluation.
   */
  public get result(): number {
    return this._result;
  }
  /**
     * Evaluates the top operator on the operators stack with the top two
     * values on the values stack.
     * @param values - The stack of values.
     * @param operators - The stack of operators.
     */

  private evaluateOperator(values: number[], operators: TokenType[]) {
    const operator = operators.pop();
    const operand2 = values.pop();
    const operand1 = values.pop();
    if (operator && operand1 !== undefined && operand2 !== undefined) {
      switch (operator) {
        case "+":
          values.push(operand1 + operand2);
          break;
        case "-":
          values.push(operand1 - operand2);
          break;
        case "*":
          values.push(operand1 * operand2);
          break;
        case "/":
          if (operand2 == 0) {
            this._errorMessage = ErrorMessages.divideByZero;
            this._errorOccured = true;
            this._result = Infinity;
            break
          } else {
            values.push(operand1 / operand2);
          }
          break;
        default:
          this._errorMessage = ErrorMessages.invalidOperator;
          this._errorOccured = true;
          break;
      }
    } else {
      this._errorMessage = ErrorMessages.invalidOperator;
      this._errorOccured = true;
    }
  }
  /**
   * Determines the precedence level of a given operator.
   * @param operator - The operator whose precedence level is to be determined.
   * @returns The precedence level of the operator.
   */
  private precedence(operator: TokenType): number {
    switch (operator) {
      case "+":
      case "-":
        return 1;
      case "*":
      case "/":
        return 2;
      default:
        return 0;
    }
  }
  /**
   * Checks if a given token is an operator.
   * @param token - The token to check.
   * @returns true if the token is an operator, false otherwise.
   */
  private isOperator(token: TokenType): boolean {
    return ["+", "-", "*", "/"].includes(token);
  }
  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }


  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;