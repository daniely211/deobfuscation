export const setDynamicCode = code => ({
    type: 'SET_DYNAMIC_CODE',
    code
})

export const setStaticCode = code => ({
    type: 'SET_STATIC_CODE',
    code
})

export const setConsoleCode = code => ({
    type: 'SET_CONSOLE_CODE',
    code
})

export const setConsoleResponse = response => ({
    type: 'SET_CONSOLE_RESPONSE',
    response
})

export const setExecutionLog = log => ({
    type: 'SET_EXECUTION_LOG',
    log
})

export const setDetails = () => ({
    type: 'SET_DETAILS',
})

export const setCodeTree = (treeJson) => ({
    type: 'SET_CODE_TREE',
    treeJson
})

export const setFunctionNames = (functionNames) => ({
    type: 'SET_FUNCTION_NAMES',
    functionNames
})

export const setSelectedFunctions = (event) => ({
    type: 'SET_SELECTED_FUNCTION_NAME',
    event
})

export const setShowDiff = () => ({
    type: 'SET_SHOW_DIFF',
})
