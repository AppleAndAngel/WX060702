import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { RuleSet, RuleSetImportData } from '@/types';
import { builtinRuleSets } from '@/data/ruleSets';
import { generateId, readFileAsText } from '@/utils/pixelUtils';

export const useRuleSetStore = defineStore('ruleSet', () => {
  const customRuleSets = ref<RuleSet[]>([]);
  const currentRuleSetId = ref<string>(builtinRuleSets[0].id);

  const allRuleSets = computed<RuleSet[]>(() => [
    ...builtinRuleSets,
    ...customRuleSets.value,
  ]);

  const currentRuleSet = computed<RuleSet | undefined>(() => {
    return allRuleSets.value.find(r => r.id === currentRuleSetId.value);
  });

  const setCurrentRuleSet = (id: string) => {
    const exists = allRuleSets.value.find(r => r.id === id);
    if (exists) {
      currentRuleSetId.value = id;
    }
  };

  const addCustomRuleSet = (ruleSetData: RuleSetImportData): RuleSet => {
    const newRuleSet: RuleSet = {
      ...ruleSetData,
      id: generateId(),
      isCustom: true,
      gridSize: ruleSetData.gridSize || { width: 32, height: 32 },
    };
    customRuleSets.value.push(newRuleSet);
    return newRuleSet;
  };

  const removeCustomRuleSet = (id: string) => {
    const index = customRuleSets.value.findIndex(r => r.id === id);
    if (index !== -1) {
      customRuleSets.value.splice(index, 1);
      if (currentRuleSetId.value === id) {
        currentRuleSetId.value = builtinRuleSets[0].id;
      }
    }
  };

  const importRuleSetFromFile = async (file: File): Promise<RuleSet> => {
    const text = await readFileAsText(file);
    const data = JSON.parse(text) as RuleSetImportData;
    
    if (!validateRuleSetData(data)) {
      throw new Error('无效的规则集文件格式');
    }
    
    return addCustomRuleSet(data);
  };

  const validateRuleSetData = (data: unknown): data is RuleSetImportData => {
    if (typeof data !== 'object' || data === null) return false;
    
    const obj = data as Record<string, unknown>;
    
    if (typeof obj.name !== 'string') return false;
    if (typeof obj.description !== 'string') return false;
    if (!Array.isArray(obj.entityRules)) return false;
    if (!Array.isArray(obj.palette)) return false;
    if (typeof obj.background !== 'string') return false;
    
    return true;
  };

  const exportRuleSet = (id: string): string | null => {
    const ruleSet = allRuleSets.value.find(r => r.id === id);
    if (!ruleSet) return null;
    
    const exportData: RuleSetImportData = {
      name: ruleSet.name,
      description: ruleSet.description,
      entityRules: ruleSet.entityRules,
      palette: ruleSet.palette,
      background: ruleSet.background,
      gridSize: ruleSet.gridSize,
    };
    
    return JSON.stringify(exportData, null, 2);
  };

  return {
    customRuleSets,
    currentRuleSetId,
    allRuleSets,
    currentRuleSet,
    setCurrentRuleSet,
    addCustomRuleSet,
    removeCustomRuleSet,
    importRuleSetFromFile,
    exportRuleSet,
  };
}, {
  persist: {
    key: 'pixel-dream-rulesets',
    paths: ['customRuleSets', 'currentRuleSetId'],
  },
});
