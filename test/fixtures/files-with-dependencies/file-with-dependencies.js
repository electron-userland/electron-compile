import dependencyA from './dependency-a';

class FileWithDependencies {
  constructor() {
    dependencyA();
  }
}
