import { describe, expect, it, vi } from 'vitest';
import { loadOperatorFunnelContext } from './operator-funnel-context';

describe('contexto inicial do funil do Operador', () => {
  it('entrega negócio e destinos do contato usando organização e escopo publicados', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'negocio', pipeline_id: 'funil', stage_id: 'entrada',
      status: 'open', stages: [{ id: 'agenda', name: 'Consulta marcada', is_won: false }] }] });
    const text = await loadOperatorFunnelContext({ query } as never, {
      organizationId: 'org', contactId: 'contato', pipelineIds: ['funil'],
    });
    expect(query.mock.calls[0]?.[1]).toEqual(['org', 'contato', ['funil']]);
    expect(text).toContain('"id":"negocio"');
    expect(text).toContain('"id":"agenda"');
    expect(text).toContain('não mova todos');
  });

  it('sem funil autorizado não consulta negócios de outros times', async () => {
    const query = vi.fn();
    expect(await loadOperatorFunnelContext({ query } as never, {
      organizationId: 'org', contactId: 'contato', pipelineIds: [],
    })).toContain('Nenhum funil autorizado');
    expect(query).not.toHaveBeenCalled();
  });
});
