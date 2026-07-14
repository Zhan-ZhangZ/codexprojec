import { MockKiCadClient } from '../src/client/mock-client.js';
import { ConnectionError, ProjectError, OperationError } from '../src/errors/index.js';

describe('MockKiCadClient', () => {
  let client: MockKiCadClient;

  beforeEach(() => {
    client = new MockKiCadClient();
    client.setSimulateDelay(0); // Speed up tests
  });

  afterEach(async () => {
    if (client.isConnected()) {
      await client.disconnect();
    }
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      await client.connect();
      expect(client.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await client.connect();
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should throw error when connection fails', async () => {
      client.injectError('connect');
      await expect(client.connect()).rejects.toThrow(ConnectionError);
    });

    it('should throw error when operation is attempted while disconnected', async () => {
      await expect(client.createProject('test', '/tmp/test')).rejects.toThrow(
        ConnectionError
      );
    });
  });

  describe('Project Operations', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should create a new project', async () => {
      const project = await client.createProject('my-project', '/tmp/my-project');
      expect(project.name).toBe('my-project');
      expect(project.path).toBe('/tmp/my-project');
      expect(project.schematicPath).toBeDefined();
      expect(project.pcbPath).toBeDefined();
    });

    it('should open an existing project', async () => {
      const project = await client.openProject('/tmp/existing-project');
      expect(project.name).toBe('existing-project');
      expect(project.path).toBe('/tmp/existing-project');
    });

    it('should close a project', async () => {
      await client.createProject('test', '/tmp/test');
      await client.closeProject();
      const current = await client.getCurrentProject();
      expect(current).toBeNull();
    });

    it('should get current project', async () => {
      const created = await client.createProject('test', '/tmp/test');
      const current = await client.getCurrentProject();
      expect(current).toEqual(created);
    });

    it('should handle project creation errors', async () => {
      client.injectError('createProject');
      await expect(client.createProject('test', '/tmp/test')).rejects.toThrow(
        ProjectError
      );
    });
  });

  describe('Board Operations', () => {
    beforeEach(async () => {
      await client.connect();
      await client.createProject('test', '/tmp/test');
    });

    it('should load a board', async () => {
      const board = await client.loadBoard('/tmp/test/test.kicad_pcb');
      expect(board.path).toBe('/tmp/test/test.kicad_pcb');
      expect(board.layers).toBe(2);
      expect(board.components).toEqual([]);
    });

    it('should save a board', async () => {
      await client.loadBoard('/tmp/test/test.kicad_pcb');
      await expect(client.saveBoard('/tmp/test/test-v2.kicad_pcb')).resolves.not.toThrow();
    });

    it('should handle board load errors', async () => {
      client.injectError('loadBoard');
      await expect(client.loadBoard('/tmp/test/test.kicad_pcb')).rejects.toThrow(
        ProjectError
      );
    });
  });

  describe('Component Operations', () => {
    beforeEach(async () => {
      await client.connect();
      await client.createProject('test', '/tmp/test');
    });

    it('should add a component', async () => {
      const component = await client.addComponent({
        value: '10k',
        footprint: 'Resistor_SMD:R_0805',
        position: { x: 100, y: 100 },
        rotation: 0,
        layer: 'front',
      });

      expect(component.reference).toBe('U1');
      expect(component.value).toBe('10k');
      expect(component.footprint).toBe('Resistor_SMD:R_0805');
    });

    it('should get all components', async () => {
      await client.addComponent({
        value: '10k',
        footprint: 'Resistor_SMD:R_0805',
        position: { x: 100, y: 100 },
        rotation: 0,
        layer: 'front',
      });

      const components = await client.getComponents();
      expect(components.length).toBe(1);
      expect(components[0].reference).toBe('U1');
    });

    it('should remove a component', async () => {
      await client.addComponent({
        value: '10k',
        footprint: 'Resistor_SMD:R_0805',
        position: { x: 100, y: 100 },
        rotation: 0,
        layer: 'front',
      });

      await client.removeComponent('U1');
      const components = await client.getComponents();
      expect(components.length).toBe(0);
    });

    it('should throw error when removing non-existent component', async () => {
      await expect(client.removeComponent('U999')).rejects.toThrow(OperationError);
    });
  });

  describe('DRC/ERC Operations', () => {
    beforeEach(async () => {
      await client.connect();
      await client.createProject('test', '/tmp/test');
    });

    it('should run DRC successfully', async () => {
      const result = await client.runDRC();
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should run ERC successfully', async () => {
      const result = await client.runERC();
      expect(result.passed).toBe(true);
    });

    it('should report warnings when no components', async () => {
      const result = await client.runDRC();
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Export Operations', () => {
    beforeEach(async () => {
      await client.connect();
      await client.createProject('test', '/tmp/test');
    });

    it('should export to gerber format', async () => {
      const files = await client.export({
        outputDir: '/tmp/output',
        format: 'gerber',
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files[0]).toContain('.gbr');
    });

    it('should generate 3D model', async () => {
      const file = await client.generate3D('/tmp/output/model', 'step');
      expect(file).toContain('.step');
    });

    it('should generate BOM', async () => {
      const file = await client.generateBOM('/tmp/output/bom');
      expect(file).toContain('.csv');
    });
  });

  describe('Auto-routing', () => {
    beforeEach(async () => {
      await client.connect();
      await client.createProject('test', '/tmp/test');
    });

    it('should auto-route with components', async () => {
      await client.addComponent({
        value: '10k',
        footprint: 'Resistor_SMD:R_0805',
        position: { x: 100, y: 100 },
        rotation: 0,
        layer: 'front',
      });

      await expect(client.autoRoute()).resolves.not.toThrow();
    });

    it('should throw error when auto-routing without components', async () => {
      await expect(client.autoRoute()).rejects.toThrow(OperationError);
    });
  });
});
