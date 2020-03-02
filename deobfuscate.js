const recast = require("recast");
const fs = require('fs') 
const ast_types = require('ast-types')
const n = ast_types.namedTypes
function RemoveCommnets(code) {
    return code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'')
}

function removeComments(code) {
    code = RemoveCommnets(code)
    const ast = recast.parse(code);
    var output = recast.prettyPrint(ast, { tabWidth: 2 }).code;
    return output
}


// type Expression = ThisExpression | Identifier | Literal |
//     ArrayExpression | ObjectExpression | FunctionExpression | ArrowFunctionExpression | ClassExpression |
//     TaggedTemplateExpression | MemberExpression | Super | MetaProperty |
//     NewExpression | CallExpression | UpdateExpression | AwaitExpression | UnaryExpression |
//     BinaryExpression | LogicalExpression | ConditionalExpression |
//     YieldExpression | AssignmentExpression | SequenceExpression;

// type Statement = BlockStatement | BreakStatement | ContinueStatement |
//     DebuggerStatement | DoWhileStatement | EmptyStatement |
//     ExpressionStatement | ForStatement | ForInStatement |
//     ForOfStatement | FunctionDeclaration | IfStatement |
//     LabeledStatement | ReturnStatement | SwitchStatement |
//     ThrowStatement | TryStatement | VariableDeclaration |
//     WhileStatement | WithStatement;
function main() {
    let data = fs.readFileSync('test/obfuscateio.js')
    let code = data.toString()
    code = removeComments(code)    
    // console.log(code)
    const ast = recast.parse(code);
    // console.log(ast)
    const bodies = ast.program.body;
    // console.log(bodies)
    // const firstBody = ast.program.body;
    // console.log(firstBody)
    var output = recast.prettyPrint(ast, { tabWidth: 2 }).code;
    fs.writeFileSync('test/prettyObfuscateIO.js', output)

    // console.log(output)
    recast.visit(ast, {
        visitMemberExpression(path){
            // the navigation code here...
            var node = path.node;
            // console.log(node.object.name)
            // console.log(n.Identifier.check(node.object))
            // console.log(node.property)
            if (
                n.Identifier.check(node.object) &&
                node.object.name === "document"
            ) {
                // console.log(node.property)
                let docFunc = node.property.value
                let docfuncArgs
                if (!docFunc) {
                    console.log("need to traverse more to find the document function")
                }

                console.log(`Using the document obj with function :${docFunc} With arguments ${docfuncArgs}`)
                // console.log("Using the document obj with function : " + docFunc + " With arguments " + )
            }
            this.traverse(path);
        }
        
    })

}


main()
