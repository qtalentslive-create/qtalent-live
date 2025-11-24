const { Project, SyntaxKind } = require("ts-morph");
const path = require("path");

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "..", "tsconfig.json"),
});

project.addSourceFilesAtPaths([
  "src/**/*.ts",
  "src/**/*.tsx",
  "src/**/*.js",
  "src/**/*.jsx",
]);

const files = project.getSourceFiles();

let modifiedCount = 0;
console.log(`Scanning ${files.length} source files...`);

for (const file of files) {
  let fileModified = false;

  const expressionStatements = file.getDescendantsOfKind(
    SyntaxKind.ExpressionStatement
  );

  for (const statement of expressionStatements) {
    const callExpr = statement.getExpressionIfKind(SyntaxKind.CallExpression);
    if (!callExpr) continue;

    const expression = callExpr.getExpression();

    if (
      expression.getKind() === SyntaxKind.PropertyAccessExpression &&
      expression.getExpression().getText() === "console" &&
      expression.getName() === "log"
    ) {
      statement.remove();
      fileModified = true;
    }
  }

  if (fileModified) {
    modifiedCount += 1;
    file.saveSync();
  }
}

console.log(`Removed console.log statements from ${modifiedCount} files.`);

