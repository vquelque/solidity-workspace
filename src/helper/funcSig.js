'use strict';
/** 
 * @author github.com/tintinweb
 * @author github.com/vquelque
 * @license MIT
 * 
 * */

// https://github.com/ethereum/eth-abi/blob/b02fc85b01a9674add88483b0d6144029c09e0a0/eth_abi/grammar.py#L402-L408
const TYPE_ALIASES = {
  int: 'int256',
  uint: 'uint256',
  fixed: 'fixed128x18',
  ufixed: 'ufixed128x18',
  function: 'bytes24',
};
const evmTypeRegex = new RegExp(
  `(?<type>(${Object.keys(TYPE_ALIASES).join('|')}))(?<tail>(\\[[^\\]]*\\])?)$`,
  'g'
);

function canonicalizeEvmType(evmArg) {
  function replacer(...groups) {
    const foundings = groups.pop();
    return `${TYPE_ALIASES[foundings.type]}${foundings.tail}`;
  }
  return evmArg.replace(evmTypeRegex, replacer);
}

function getCanonicalizedArgumentFromAstNode(
  node,
  _parent,
  contract,
  array = false,
  isStruct = false
) {
  if (!array && !node.typeName) {
    console.log(node);
    throw new Error('Failed to unpack function argument type');
  }
  const argStorageLocation = node.storageLocation;
  const argTypeNode = !array ? node.typeName : node;
  switch (argTypeNode.type) {
    case 'ElementaryTypeName':
      return argTypeNode.name;
    case 'ArrayTypeName':
      const repr =
        getCanonicalizedArgumentFromAstNode(
          argTypeNode.baseTypeName,
          _parent,
          contract,
          true
        ) + '[]';
      return repr;
    case 'UserDefinedTypeName':
      if (!argStorageLocation && !isStruct) {
        return 'address';
      }
      const sourceUnit = contract._parent;
      const struct =
        contract.structs[argTypeNode.namePath] ||
        contract.inherited_structs[argTypeNode.namePath] ||
        sourceUnit.structs[argTypeNode.namePath];
      if (!struct) {
        throw new Error(
          `Failed to resolve struct ${node.namePath} in current scope.`
        );
      }
      const structTypes = struct.members.map((m) =>
        getCanonicalizedArgumentFromAstNode(m, _parent,contract, false, true)
      );
      const structSig = '(' + structTypes.join(',') + ')';
      return structSig;
    default:
      console.log(argTypeNode);
      throw new Error('wrong argument type: ' + argTypeNode.name);
  }
}

module.exports = {
  getCanonicalizedArgumentFromAstNode,
  canonicalizeEvmType
};