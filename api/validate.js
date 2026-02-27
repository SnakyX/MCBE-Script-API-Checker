import ts from "typescript";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  const options = {
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: false,
  };

  const fileName = "file.ts";

  const host = ts.createCompilerHost(options);

  host.getSourceFile = (fileName, languageVersion) =>
    ts.createSourceFile(fileName, code, languageVersion);

  const program = ts.createProgram([fileName], options, host);

  const diagnostics = ts.getPreEmitDiagnostics(program);

  const errors = diagnostics.map((d) => ({
    message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    line: d.file
      ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
      : null,
  }));

  res.status(200).json({
    valid: errors.length === 0,
    errors,
  });
}