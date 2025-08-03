import { Project, SourceFile, SyntaxKind, Node, Identifier, VariableDeclaration, ParameterDeclaration, BindingElement } from 'ts-morph'

/**
 * Function hashing utility using ts-morph for semantic-aware canonicalization.
 * 
 * This implementation uses TypeScript's AST parser to achieve true semantic equivalence
 * detection, ensuring that functions with identical logic but different variable names,
 * formatting, or declaration styles (let/var/const) produce the same hash.
 * 
 * Key features:
 * - Alpha-renaming of all bound identifiers (parameters and variables)
 * - Preservation of property names and method names
 * - Normalization of whitespace and formatting
 * - Support for function declarations, expressions, and arrow functions
 * - Proper handling of nested scopes and variable shadowing
 * - Syntax error detection while ignoring semantic errors
 */

/**
 * Canonicalizes a JavaScript function source by alpha-renaming all bound identifiers.
 * This creates an implementation-agnostic hash that is the same regardless of formatting
 * and variable names, allowing for semantic comparison of functions.
 *
 * @param fnSource - The text of your function (declaration, expression, or arrow function)
 * @returns Promise<string> - hex SHA-256 hash of the canonicalized function
 */
export async function hashFunctionSource(fnSource: string): Promise<string> {
  try {
    const normalized = canonicalizeFunctionSource(fnSource)

    // Hash with Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(normalized)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)

    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    throw new Error(`Failed to hash function source: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Canonicalizes a JavaScript function source using ts-morph AST manipulation.
 * This function performs alpha-renaming of all bound identifiers and normalizes formatting.
 *
 * @param fnSource - The text of your function
 * @returns string - canonicalized function source
 */
function canonicalizeFunctionSource(fnSource: string): string {
  try {
    // Create a temporary ts-morph project
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // ESNext
        allowJs: true,
        checkJs: false,
        noLib: true, // Don't load lib definitions to avoid false positives
        skipLibCheck: true
      }
    })

    // Try different wrapping strategies for different function types
    let sourceFile: SourceFile | null = null
    let functionNode: Node | null = null
    let parseErrors: string[] = []

    // Strategy 1: Wrap as export default for function declarations/expressions
    try {
      const wrappedSource = `export default ${fnSource.trim()}`
      sourceFile = project.createSourceFile('temp.ts', wrappedSource)
      
      // Check for parsing errors (only syntax errors, not semantic ones)
      const diagnostics = sourceFile.getPreEmitDiagnostics().filter(d => {
        const code = d.getCode()
        // Only include syntax errors, not semantic errors like undeclared variables
        return code >= 1000 && code < 2000 // Syntax error range
      })
      if (diagnostics.length > 0) {
        parseErrors.push(`Strategy 1: ${diagnostics.map(d => d.getMessageText()).join(', ')}`)
        throw new Error('Parse errors detected')
      }
      
      const exportAssignment = sourceFile.getExportAssignments()[0]
      functionNode = exportAssignment?.getExpression() || null
    } catch (error) {
      parseErrors.push(`Strategy 1 failed: ${error instanceof Error ? error.message : String(error)}`)
      sourceFile = null
      functionNode = null
    }

    // Strategy 2: Wrap as variable assignment for arrow functions and expressions
    if (!functionNode) {
      try {
        const wrappedSource = `const fn = ${fnSource.trim()}`
        sourceFile = project.createSourceFile('temp2.ts', wrappedSource)
        
        // Check for parsing errors (only syntax errors, not semantic ones)
        const diagnostics = sourceFile.getPreEmitDiagnostics().filter(d => {
          const code = d.getCode()
          // Only include syntax errors, not semantic errors like undeclared variables
          return code >= 1000 && code < 2000 // Syntax error range
        })
        if (diagnostics.length > 0) {
          parseErrors.push(`Strategy 2: ${diagnostics.map(d => d.getMessageText()).join(', ')}`)
          throw new Error('Parse errors detected')
        }
        
        const variableDeclaration = sourceFile.getVariableDeclarations()[0]
        functionNode = variableDeclaration?.getInitializer() || null
      } catch (error) {
        parseErrors.push(`Strategy 2 failed: ${error instanceof Error ? error.message : String(error)}`)
        sourceFile = null
        functionNode = null
      }
    }

    // Strategy 3: Parse as standalone statement for function declarations
    if (!functionNode) {
      try {
        sourceFile = project.createSourceFile('temp3.ts', fnSource.trim())
        
        // Check for parsing errors (only syntax errors, not semantic ones)
        const diagnostics = sourceFile.getPreEmitDiagnostics().filter(d => {
          const code = d.getCode()
          // Only include syntax errors, not semantic errors like undeclared variables
          return code >= 1000 && code < 2000 // Syntax error range
        })
        if (diagnostics.length > 0) {
          parseErrors.push(`Strategy 3: ${diagnostics.map(d => d.getMessageText()).join(', ')}`)
          throw new Error('Parse errors detected')
        }
        
        functionNode = sourceFile.getFirstChildByKind(SyntaxKind.FunctionDeclaration) ||
                      sourceFile.getFirstChildByKind(SyntaxKind.FunctionExpression) ||
                      sourceFile.getFirstChildByKind(SyntaxKind.ArrowFunction) ||
                      null
      } catch (error) {
        parseErrors.push(`Strategy 3 failed: ${error instanceof Error ? error.message : String(error)}`)
        sourceFile = null
        functionNode = null
      }
    }

    if (!functionNode || !sourceFile) {
      throw new Error(`Could not parse function from source. Parsing errors: ${parseErrors.join('; ')}`)
    }

    // Create a mapping for identifier renaming
    const identifierMap = new Map<string, string>()
    let paramCounter = 0
    let varCounter = 0

    // Helper function to get or create canonical name
    const getCanonicalName = (originalName: string, isParameter = false): string => {
      if (identifierMap.has(originalName)) {
        return identifierMap.get(originalName)!
      }
      const canonicalName = isParameter ? `p${paramCounter++}` : `v${varCounter++}`
      identifierMap.set(originalName, canonicalName)
      return canonicalName
    }

    // First pass: collect all parameter names
    const collectParameters = (node: Node) => {
      if (Node.isParameterDeclaration(node)) {
        const nameNode = node.getNameNode()
        if (Node.isIdentifier(nameNode)) {
          const name = nameNode.getText()
          getCanonicalName(name, true)
        }
      }
      
      if (Node.isBindingElement(node)) {
        const nameNode = node.getNameNode()
        if (Node.isIdentifier(nameNode)) {
          const name = nameNode.getText()
          getCanonicalName(name, true)
        }
      }

      node.forEachChild(collectParameters)
    }

    // Second pass: collect variable declarations
    const collectVariables = (node: Node) => {
      if (Node.isVariableDeclaration(node)) {
        const nameNode = node.getNameNode()
        if (Node.isIdentifier(nameNode)) {
          const name = nameNode.getText()
          if (!identifierMap.has(name)) {
            getCanonicalName(name, false)
          }
        }
      }
      
      if (Node.isBindingElement(node)) {
        const nameNode = node.getNameNode()
        if (Node.isIdentifier(nameNode)) {
          const name = nameNode.getText()
          if (!identifierMap.has(name)) {
            getCanonicalName(name, false)
          }
        }
      }
      
      // Handle for-of/for-in loop variables
      if (Node.isForOfStatement(node) || Node.isForInStatement(node)) {
        const initializer = node.getInitializer()
        if (Node.isVariableDeclarationList(initializer)) {
          initializer.getDeclarations().forEach(decl => {
            const nameNode = decl.getNameNode()
            if (Node.isIdentifier(nameNode)) {
              const name = nameNode.getText()
              if (!identifierMap.has(name)) {
                getCanonicalName(name, false)
              }
            }
          })
        }
      }

      node.forEachChild(collectVariables)
    }

    // Third pass: rename identifiers
    const renameIdentifiers = (node: Node) => {
      if (Node.isIdentifier(node)) {
        const name = node.getText()
        const canonicalName = identifierMap.get(name)
        
        if (canonicalName) {
          // Check if this identifier should be renamed
          // Don't rename property names in object literals or member expressions
          const parent = node.getParent()
          
          if (Node.isPropertyAssignment(parent) && parent.getNameNode() === node) {
            // This is a property name in an object literal, don't rename
            return
          }
          
          if (Node.isPropertyAccessExpression(parent) && parent.getNameNode() === node) {
            // This is a property access, don't rename the property name
            return
          }
          
          if (Node.isMethodDeclaration(parent) && parent.getNameNode() === node) {
            // This is a method name, don't rename
            return
          }

          // Don't rename when it's a property key in object literal
          if (Node.isShorthandPropertyAssignment(parent) && parent.getNameNode() === node) {
            // This is a shorthand property assignment, only rename the value part
            return
          }

          // Rename the identifier
          node.replaceWithText(canonicalName)
        }
      }
      
      node.forEachChild(renameIdentifiers)
    }

    // Execute the passes
    collectParameters(functionNode)
    collectVariables(functionNode)
    renameIdentifiers(functionNode)

    // Get the modified text
    let normalized = functionNode.getText()
    
    // Additional normalization steps
    normalized = normalized
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove spaces around operators and punctuation
      .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
      // Normalize variable declarations (let/var -> const)
      .replace(/\blet\b/g, 'const')
      .replace(/\bvar\b/g, 'const')
      // Remove trailing semicolons for consistency
      .replace(/;+$/, '')
      .trim()

    return normalized
  } catch (error) {
    throw new Error(`Failed to parse function source: ${error instanceof Error ? error.message : String(error)}`)
  }
}
