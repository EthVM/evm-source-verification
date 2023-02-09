#! /usr/bin/env bash

set -euo pipefail

echo "=====================================";
echo "=== checking for OFAC sanctioned contracts.";
echo

echo "=====================================";
echo "=== tornado cash ofac sanction notice: https://home.treasury.gov/news/press-releases/jy0916";
echo "=== tornado cash sanctioned contract list: https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20220808";
echo

# not tornado cash:
echo "=====================================";
echo "=== testing scanner (you should see 2 results, these are not a sanctioned contract)"
ls -a ./{contracts,unsupported}/1/ | grep "0xfFFED8edc3ddC66DE57f7feA41F07F98595F0A5C" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x7c24be3FC9A03bdaf87FFC15EC7860065B9dA06D" -i;
echo

# is tornado cash:
echo "=====================================";
echo "=== sanctioned tornado cash contracts:"
ls -a ./{contracts,unsupported}/1/ | grep "0x8589427373D6D84E98730D7795D8f6f8731FDA16" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x722122dF12D4e14e13Ac3b6895a86e84145b6967" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xDD4c48C0B24039969fC16D1cdF626eaB821d3384" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xd96f2B1c14Db8458374d9Aca76E26c3D18364307" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xF60dD140cFf0706bAE9Cd734Ac3ae76AD9eBC32A" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x22aaA7720ddd5388A3c0A3333430953C68f1849b" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xBA214C1c1928a32Bffe790263E38B4Af9bFCD659" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xb1C8094B234DcE6e03f10a5b673c1d8C69739A00" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xD691F27f38B395864Ea86CfC7253969B409c362d" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xaEaaC358560e11f52454D997AAFF2c5731B6f8a6" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x1356c899D8C9467C7f71C195612F8A395aBf2f0a" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xA60C772958a3eD56c1F15dD055bA37AC8e523a0D" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x169AD27A470D064DEDE56a2D3ff727986b15D52B" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xF67721A2D8F736E75a49FdD7FAd2e31D8676542a" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x9AD122c22B14202B4490eDAf288FDb3C7cb3ff5E" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x905b63Fff465B9fFBF41DeA908CEb12478ec7601" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x07687e702b410Fa43f4cB4Af7FA097918ffD2730" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x94A1B5CdB22c43faab4AbEb5c74999895464Ddaf" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xb541fc07bC7619fD4062A54d96268525cBC6FfEF" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x23773E65ed146A459791799d01336DB287f25334" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xD21be7248e0197Ee08E0c20D4a96DEBdaC3D20Af" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x610B717796ad172B316836AC95a2ffad065CeaB4" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x178169B423a011fff22B9e3F3abeA13414dDD0F1" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xbB93e510BbCD0B7beb5A853875f9eC60275CF498" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x2717c5e28cf931547B621a5dddb772Ab6A35B701" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x03893a7c7463AE47D46bc7f091665f1893656003" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xCa0840578f57fE71599D29375e16783424023357" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2" -i;

ls -a ./{contracts,unsupported}/1/ | grep "0x8589427373D6D84E98730D7795D8f6f8731FDA16" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x722122dF12D4e14e13Ac3b6895a86e84145b6967" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xDD4c48C0B24039969fC16D1cdF626eaB821d3384" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0xd96f2B1c14Db8458374d9Aca76E26c3D18364307" -i;
ls -a ./{contracts,unsupported}/1/ | grep "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D" -i;