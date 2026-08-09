/**
 * Группирует персоны по поколениям
 * @param {Array} persons - Массив персон
 * @returns {Array<Array>} Двухмерный массив, где каждый элемент - поколение
 */
export function groupPersonsByGeneration(persons) {
  if (!Array.isArray(persons)) return [];

  const generations = {};

  persons.forEach(person => {
    const gen = person.generation || 1;
    if (!generations[gen]) {
      generations[gen] = [];
    }
    generations[gen].push(person);
  });

  return Object.keys(generations)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(gen => generations[gen]);
}

/**
 * Получает информацию о связи между двумя персонами
 * @param {Object} person1 - Первая персона
 * @param {Object} person2 - Вторая персона
 * @returns {string} Тип связи
 */
export function getRelationship(person1, person2) {
  const genDiff = person2.generation - person1.generation;

  if (genDiff === 0) return 'sibling';
  if (genDiff === 1) return 'parent';
  if (genDiff === -1) return 'child';
  if (genDiff > 1) return 'ancestor';
  if (genDiff < -1) return 'descendant';

  return 'relative';
}

/**
 * Сортирует персоны внутри поколения по логическому порядку
 * @param {Array} persons - Массив персон в одном поколении
 * @returns {Array} Отсортированный массив
 */
export function sortPersonsInGeneration(persons) {
  return [...persons].sort((a, b) => {
    const aYear = a.birthYear || 0;
    const bYear = b.birthYear || 0;
    return aYear - bYear;
  });
}
