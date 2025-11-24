const { Project, SyntaxKind } = require("ts-morph");
const path = require("path");

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "..", "tsconfig.json"),
});

const files = project.getSourceFiles([
  "src/**/*.ts",
  "src/**/*.tsx",
  "src/**/*.js",
  "src/**/*.jsx",
]);

let modifiedCount = 0;

for (const file of files) {
  let fileModified = false;

  const callExpressions = file.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const callExpr of callExpressions) {
    const expression = callExpr.getExpression();

    if (
      expression.getKind() === SyntaxKind.PropertyAccessExpression &&
      expression.getExpression().getText() === "console" &&
      expression.getName() === "log"
    ) {
      const statement = callExpr.getFirstAncestorByKind(
        SyntaxKind.ExpressionStatement
      );

      if (statement) {
        statement.remove();
        fileModified = true;
      }
    }
  }

  if (fileModified) {
    modifiedCount += 1;
    file.saveSync();
  }
}

console.log(`Removed console.log statements from ${modifiedCount} files.`);

